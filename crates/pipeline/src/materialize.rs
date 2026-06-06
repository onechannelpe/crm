use crate::PipelineError;
use crate::storage::db::open_rw;

pub fn materialize_serving(db_path: &str) -> Result<(), PipelineError> {
    let mut conn = open_rw(db_path)?;
    let tx = conn.transaction()?;

    create_dirty_worksets(&tx)?;

    let dirty_doc_count: i64 =
        tx.query_row("SELECT COUNT(*) FROM tmp_dirty_doc_ids", [], |row| {
            row.get(0)
        })?;
    let dirty_company_count: i64 =
        tx.query_row("SELECT COUNT(*) FROM tmp_dirty_company_ids", [], |row| {
            row.get(0)
        })?;

    if dirty_doc_count == 0 && dirty_company_count == 0 {
        tx.commit()?;
        println!("materialized serving tables (no changes)");
        return Ok(());
    }

    if dirty_doc_count > 0 {
        materialize_doc_projection(&tx)?;
    }

    if dirty_company_count > 0 {
        materialize_company_projection(&tx)?;
    }

    clear_dirty_worksets(&tx)?;

    tx.commit()?;
    println!("materialized serving tables");
    Ok(())
}

fn create_dirty_worksets(tx: &rusqlite::Transaction<'_>) -> Result<(), PipelineError> {
    tx.execute_batch(
        r#"
        CREATE TEMP TABLE tmp_dirty_doc_ids AS
        SELECT doc_id FROM projection_dirty_doc;

        CREATE TEMP TABLE tmp_dirty_company_ids AS
        SELECT company_id FROM projection_dirty_company;
        "#,
    )?;
    Ok(())
}

fn materialize_doc_projection(tx: &rusqlite::Transaction<'_>) -> Result<(), PipelineError> {
    tx.execute_batch(
        r#"
        DELETE FROM doc_projection_phone_index
        WHERE doc_id IN (SELECT doc_id FROM tmp_dirty_doc_ids);

        DELETE FROM doc_projection_fts
        WHERE rowid IN (SELECT doc_id FROM tmp_dirty_doc_ids);

        DELETE FROM doc_projection
        WHERE doc_id IN (SELECT doc_id FROM tmp_dirty_doc_ids);

        WITH
        ranked_phone AS (
            SELECT
                dp.doc_id,
                dp.phone,
                ROW_NUMBER() OVER (
                    PARTITION BY dp.doc_id
                    ORDER BY dp.confidence DESC, dp.phone
                ) AS rank_position
            FROM document_phone dp
        ),
        top_two_phones AS (
            SELECT
                doc_id,
                MAX(CASE WHEN rank_position = 1 THEN phone END) AS phone_primary,
                MAX(CASE WHEN rank_position = 2 THEN phone END) AS phone_secondary
            FROM ranked_phone
            WHERE rank_position <= 2
            GROUP BY doc_id
        ),
        top_best_email AS (
            SELECT doc_id, email
            FROM (
                SELECT
                    de.doc_id,
                    de.email,
                    ROW_NUMBER() OVER (
                        PARTITION BY de.doc_id
                        ORDER BY de.reliability DESC, de.email
                    ) AS rn
                FROM document_email de
            )
            WHERE rn = 1
        )
        INSERT INTO doc_projection(
            doc_id, doc_type, doc_number, name,
            birth_date, birth_place, sex, marital_status, location_text,
            ubigeo_code, mother_name, father_name, email, person_ruc,
            org_ruc, org_name, trade_name, company_type, org_status, org_condition,
            fiscal_address, registration_date, activity_start_date, line_of_business,
            economic_activity, org_ubigeo_code, org_department, org_province, org_district,
            role_name, role_start_date, rep_doc_type, rep_doc_number, rep_name,
            phone_primary, phone_secondary
        )
        SELECT
            d.doc_id,
            d.doc_type,
            d.doc_number,
            NULLIF(da.full_name, '')        AS name,
            da.birth_date,
            da.birth_place,
            da.sex,
            da.marital_status,
            da.location_text,
            da.ubigeo_code,
            da.mother_name,
            da.father_name,
            tbe.email,
            da.natural_ruc10                AS person_ruc,
            NULLIF(cp.ruc, '')              AS org_ruc,
            NULLIF(cp.legal_name, '')       AS org_name,
            cp.trade_name,
            cp.company_type,
            cp.status                       AS org_status,
            cp.condition                    AS org_condition,
            cp.fiscal_address,
            cp.registration_date,
            cp.activity_start_date,
            cp.line_of_business,
            cp.economic_activity,
            cp.ubigeo_code                  AS org_ubigeo_code,
            cp.department                   AS org_department,
            cp.province                     AS org_province,
            cp.district                     AS org_district,
            NULLIF(prd.role_name, '')       AS role_name,
            NULLIF(prd.role_start_date, '') AS role_start_date,
            NULLIF(prd.rep_doc_type, '')    AS rep_doc_type,
            NULLIF(prd.rep_doc_number, '')  AS rep_doc_number,
            NULLIF(prd.rep_name, '')        AS rep_name,
            phones.phone_primary,
            phones.phone_secondary
        FROM document d
        LEFT JOIN document_attribute da ON da.doc_id = d.doc_id
        LEFT JOIN primary_role_by_doc prd ON prd.doc_id = d.doc_id
        LEFT JOIN company cp ON cp.company_id = prd.company_id
        LEFT JOIN top_two_phones phones ON phones.doc_id = d.doc_id
        LEFT JOIN top_best_email tbe ON tbe.doc_id = d.doc_id
        WHERE d.doc_id IN (SELECT doc_id FROM tmp_dirty_doc_ids);

        INSERT OR IGNORE INTO doc_projection_phone_index(phone, doc_id)
        SELECT DISTINCT dp.phone, dp.doc_id
        FROM document_phone dp
        WHERE dp.doc_id IN (SELECT doc_id FROM tmp_dirty_doc_ids);

        INSERT INTO doc_projection_fts(rowid, doc_name)
        SELECT doc_id, COALESCE(name, '')
        FROM doc_projection
        WHERE doc_id IN (SELECT doc_id FROM tmp_dirty_doc_ids);

        DELETE FROM doc_phone_agg
        WHERE doc_id IN (SELECT doc_id FROM tmp_dirty_doc_ids);

        INSERT INTO doc_phone_agg(doc_id, phones)
        SELECT doc_id, group_concat(phone, ';')
        FROM (
            SELECT dpi.doc_id, dpi.phone
            FROM doc_projection_phone_index dpi
            WHERE dpi.doc_id IN (SELECT doc_id FROM tmp_dirty_doc_ids)
            GROUP BY dpi.doc_id, dpi.phone
            ORDER BY dpi.doc_id, dpi.phone
        )
        GROUP BY doc_id;
        "#,
    )?;
    Ok(())
}

fn materialize_company_projection(tx: &rusqlite::Transaction<'_>) -> Result<(), PipelineError> {
    tx.execute_batch(
        r#"
        DELETE FROM company_projection_phone_index
        WHERE company_id IN (SELECT company_id FROM tmp_dirty_company_ids);

        DELETE FROM company_projection_fts
        WHERE rowid IN (SELECT company_id FROM tmp_dirty_company_ids);

        DELETE FROM company_projection
        WHERE company_id IN (SELECT company_id FROM tmp_dirty_company_ids);

        WITH
        ranked_phone AS (
            SELECT
                cph.company_id,
                cph.phone,
                ROW_NUMBER() OVER (
                    PARTITION BY cph.company_id
                    ORDER BY cph.confidence DESC, cph.phone
                ) AS rank_position
            FROM company_phone cph
        ),
        top_two_phones AS (
            SELECT
                company_id,
                MAX(CASE WHEN rank_position = 1 THEN phone END) AS phone_primary,
                MAX(CASE WHEN rank_position = 2 THEN phone END) AS phone_secondary
            FROM ranked_phone
            WHERE rank_position <= 2
            GROUP BY company_id
        )
        INSERT INTO company_projection(
            company_id, ruc, legal_name, trade_name, company_type,
            org_status, org_condition, fiscal_address, registration_date,
            activity_start_date, line_of_business, economic_activity,
            org_ubigeo_code, org_department, org_province, org_district,
            rep_doc_type, rep_doc_number, rep_name, role_name, role_start_date,
            phone_primary, phone_secondary
        )
        SELECT
            cp.company_id,
            cp.ruc,
            NULLIF(cp.legal_name, '')       AS legal_name,
            cp.trade_name,
            cp.company_type,
            cp.status                       AS org_status,
            cp.condition                    AS org_condition,
            cp.fiscal_address,
            cp.registration_date,
            cp.activity_start_date,
            cp.line_of_business,
            cp.economic_activity,
            cp.ubigeo_code                  AS org_ubigeo_code,
            cp.department                   AS org_department,
            cp.province                     AS org_province,
            cp.district                     AS org_district,
            NULLIF(prc.rep_doc_type, '')    AS rep_doc_type,
            NULLIF(prc.rep_doc_number, '')  AS rep_doc_number,
            NULLIF(prc.rep_name, '')        AS rep_name,
            NULLIF(prc.role_name, '')       AS role_name,
            NULLIF(prc.role_start_date, '') AS role_start_date,
            phones.phone_primary,
            phones.phone_secondary
        FROM company cp
        LEFT JOIN primary_role_by_company prc ON prc.company_id = cp.company_id
        LEFT JOIN top_two_phones phones ON phones.company_id = cp.company_id
        WHERE cp.company_id IN (SELECT company_id FROM tmp_dirty_company_ids);

        INSERT OR IGNORE INTO company_projection_phone_index(phone, company_id)
        SELECT DISTINCT cph.phone, cph.company_id
        FROM company_phone cph
        WHERE cph.company_id IN (SELECT company_id FROM tmp_dirty_company_ids);

        INSERT INTO company_projection_fts(rowid, company_name)
        SELECT company_id, COALESCE(legal_name, '')
        FROM company_projection
        WHERE company_id IN (SELECT company_id FROM tmp_dirty_company_ids);

        DELETE FROM ruc_phone_agg
        WHERE org_ruc IN (
            SELECT cp2.ruc FROM company cp2
            WHERE cp2.company_id IN (SELECT company_id FROM tmp_dirty_company_ids)
        );

        INSERT INTO ruc_phone_agg(org_ruc, phones)
        SELECT org_ruc, group_concat(phone, ';')
        FROM (
            SELECT cp2.ruc AS org_ruc, cpi.phone
            FROM company_projection_phone_index cpi
            JOIN company cp2 ON cp2.company_id = cpi.company_id
            WHERE cpi.company_id IN (SELECT company_id FROM tmp_dirty_company_ids)
            GROUP BY cp2.ruc, cpi.phone
            ORDER BY cp2.ruc, cpi.phone
        )
        GROUP BY org_ruc;
        "#,
    )?;
    Ok(())
}

fn clear_dirty_worksets(tx: &rusqlite::Transaction<'_>) -> Result<(), PipelineError> {
    tx.execute_batch(
        r#"
        DELETE FROM projection_dirty_doc
        WHERE doc_id IN (SELECT doc_id FROM tmp_dirty_doc_ids);

        DELETE FROM projection_dirty_company
        WHERE company_id IN (SELECT company_id FROM tmp_dirty_company_ids);
        "#,
    )?;
    Ok(())
}
