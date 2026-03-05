use crate::PipelineError;
use crate::db::schema::open_rw;

pub fn materialize_serving(db_path: &str) -> Result<(), PipelineError> {
    let mut conn = open_rw(db_path)?;
    let tx = conn.transaction()?;
    tx.execute_batch(
        r#"
        CREATE INDEX IF NOT EXISTS idx_role_person_id_role_id
            ON person_company_role(person_id, role_id);
        CREATE INDEX IF NOT EXISTS idx_person_phone_person_conf_phone
            ON person_phone(person_id, confidence DESC, phone);
        CREATE INDEX IF NOT EXISTS idx_person_email_person_rel_email
            ON person_email(person_id, reliability DESC, email);
        CREATE INDEX IF NOT EXISTS idx_projection_dirty_person_id
            ON projection_dirty_person(person_id);
        CREATE INDEX IF NOT EXISTS idx_person_phone_phone ON person_phone(phone);
        CREATE INDEX IF NOT EXISTS idx_company_phone_phone ON company_phone(phone);
        CREATE INDEX IF NOT EXISTS idx_search_projection_dni ON search_projection(dni);
        CREATE INDEX IF NOT EXISTS idx_search_projection_ruc ON search_projection(org_ruc);
        CREATE INDEX IF NOT EXISTS idx_search_projection_phone_index_phone
            ON search_projection_phone_index(phone);
        CREATE INDEX IF NOT EXISTS idx_search_projection_phone_index_projection_id_phone
            ON search_projection_phone_index(projection_id, phone);
        "#,
    )?;

    tx.execute_batch(
        r#"
        CREATE TEMP TABLE tmp_dirty_person_ids AS
        SELECT person_id
        FROM projection_dirty_person;

        CREATE TEMP TABLE tmp_dirty_old_keys AS
        SELECT
            id AS person_id,
            COALESCE(org_ruc, '') AS org_ruc,
            COALESCE(dni, '') AS dni
        FROM search_projection
        WHERE id IN (SELECT person_id FROM tmp_dirty_person_ids);
        "#,
    )?;

    let dirty_count: i64 =
        tx.query_row("SELECT COUNT(*) FROM tmp_dirty_person_ids", [], |row| {
            row.get(0)
        })?;
    if dirty_count == 0 {
        tx.commit()?;
        println!("materialized serving tables (no changes)");
        return Ok(());
    }

    tx.execute_batch(
        r#"
        DELETE FROM search_projection_phone_index
        WHERE projection_id IN (SELECT person_id FROM tmp_dirty_person_ids);

        DELETE FROM search_projection_fts
        WHERE rowid IN (SELECT person_id FROM tmp_dirty_person_ids);

        DELETE FROM search_projection
        WHERE id IN (SELECT person_id FROM tmp_dirty_person_ids);

        WITH first_role AS (
            SELECT r.person_id, r.company_id
            FROM person_company_role r
            JOIN (
                SELECT person_id, MIN(role_id) AS min_role_id
                FROM person_company_role
                WHERE person_id IS NOT NULL
                GROUP BY person_id
            ) min_role
                ON min_role.person_id = r.person_id
               AND min_role.min_role_id = r.role_id
        ),
        ranked_phone AS (
            SELECT
                pp.person_id,
                pp.phone,
                ROW_NUMBER() OVER (
                    PARTITION BY pp.person_id
                    ORDER BY pp.confidence DESC, pp.phone
                ) AS rank_position
            FROM person_phone pp
        ),
        top_two_phones AS (
            SELECT
                person_id,
                MAX(CASE WHEN rank_position = 1 THEN phone END) AS phone_primary,
                MAX(CASE WHEN rank_position = 2 THEN phone END) AS phone_secondary
            FROM ranked_phone
            WHERE rank_position <= 2
            GROUP BY person_id
        ),
        top_best_email AS (
            SELECT person_id, email
            FROM (
                SELECT
                    pe.person_id,
                    pe.email,
                    ROW_NUMBER() OVER (
                        PARTITION BY pe.person_id
                        ORDER BY pe.reliability DESC, pe.email
                    ) AS rn
                FROM person_email pe
            )
            WHERE rn = 1
        )
        INSERT INTO search_projection(
            id,
            dni,
            name,
            birth_date,
            birth_place,
            sex,
            marital_status,
            location_text,
            ubigeo_code,
            mother_name,
            father_name,
            email,
            person_ruc,
            org_ruc,
            org_name,
            trade_name,
            company_type,
            org_status,
            org_condition,
            fiscal_address,
            registration_date,
            activity_start_date,
            line_of_business,
            economic_activity,
            org_ubigeo_code,
            org_department,
            org_province,
            org_district,
            role_name,
            role_start_date,
            rep_doc_type,
            rep_doc_number,
            rep_name,
            phone_primary,
            phone_secondary
        )
        SELECT
            p.person_id AS id,
            p.dni AS dni,
            p.full_name AS name,
            p.birth_date AS birth_date,
            p.birth_place AS birth_place,
            p.sex AS sex,
            p.marital_status AS marital_status,
            p.location_text AS location_text,
            p.ubigeo_code AS ubigeo_code,
            p.mother_name AS mother_name,
            p.father_name AS father_name,
            tbe.email AS email,
            p.natural_ruc10 AS person_ruc,
            cp.ruc AS org_ruc,
            cp.legal_name AS org_name,
            cp.trade_name AS trade_name,
            cp.company_type AS company_type,
            cp.status AS org_status,
            cp.condition AS org_condition,
            cp.fiscal_address AS fiscal_address,
            cp.registration_date AS registration_date,
            cp.activity_start_date AS activity_start_date,
            cp.line_of_business AS line_of_business,
            cp.economic_activity AS economic_activity,
            cp.ubigeo_code AS org_ubigeo_code,
            cp.department AS org_department,
            cp.province AS org_province,
            cp.district AS org_district,
            pcr.role_name AS role_name,
            pcr.role_start_date AS role_start_date,
            pcr.rep_doc_type AS rep_doc_type,
            pcr.rep_doc_number AS rep_doc_number,
            pcr.rep_name AS rep_name,
            phones.phone_primary AS phone_primary,
            phones.phone_secondary AS phone_secondary
        FROM person_profile p
        LEFT JOIN first_role role ON role.person_id = p.person_id
        LEFT JOIN company_profile cp ON cp.company_id = role.company_id
        LEFT JOIN top_two_phones phones ON phones.person_id = p.person_id
        LEFT JOIN top_best_email tbe ON tbe.person_id = p.person_id
        LEFT JOIN person_company_role pcr
            ON pcr.person_id = p.person_id
            AND pcr.company_id = cp.company_id
            AND pcr.role_id = (
                SELECT MIN(r2.role_id)
                FROM person_company_role r2
                WHERE r2.person_id = p.person_id
                  AND r2.company_id = cp.company_id
            )
        WHERE p.person_id IN (SELECT person_id FROM tmp_dirty_person_ids);
        
        INSERT OR IGNORE INTO search_projection_phone_index(phone, projection_id)
        SELECT DISTINCT pp.phone, pp.person_id
        FROM person_phone pp
        WHERE pp.person_id IN (SELECT person_id FROM tmp_dirty_person_ids);

        -- Company phones surface on all resolved reps of that company.
        INSERT OR IGNORE INTO search_projection_phone_index(phone, projection_id)
        SELECT DISTINCT cp.phone, pcr.person_id
        FROM company_phone cp
        JOIN person_company_role pcr ON pcr.company_id = cp.company_id
        WHERE pcr.resolution_status = 'resolved'
          AND pcr.person_id IN (SELECT person_id FROM tmp_dirty_person_ids);

        INSERT INTO search_projection_fts(rowid, person_name, company_name)
        SELECT id, COALESCE(name,''), COALESCE(org_name,'')
        FROM search_projection
        WHERE id IN (SELECT person_id FROM tmp_dirty_person_ids);

        CREATE TEMP TABLE tmp_dirty_ruc AS
        SELECT DISTINCT org_ruc
        FROM (
            SELECT org_ruc FROM tmp_dirty_old_keys
            UNION ALL
            SELECT COALESCE(org_ruc, '') AS org_ruc
            FROM search_projection
            WHERE id IN (SELECT person_id FROM tmp_dirty_person_ids)
        )
        WHERE org_ruc <> '';

        DELETE FROM ruc_phone_agg
        WHERE org_ruc IN (SELECT org_ruc FROM tmp_dirty_ruc);

        INSERT INTO ruc_phone_agg(org_ruc, phones)
        SELECT org_ruc, group_concat(phone, ';')
        FROM (
            SELECT sp.org_ruc AS org_ruc, pi.phone AS phone
            FROM search_projection sp
            JOIN search_projection_phone_index pi ON pi.projection_id = sp.id
            WHERE sp.org_ruc IN (SELECT org_ruc FROM tmp_dirty_ruc)
            GROUP BY sp.org_ruc, pi.phone
            ORDER BY sp.org_ruc, pi.phone
        )
        GROUP BY org_ruc;

        CREATE TEMP TABLE tmp_dirty_dni AS
        SELECT DISTINCT dni
        FROM (
            SELECT dni FROM tmp_dirty_old_keys
            UNION ALL
            SELECT COALESCE(dni, '') AS dni
            FROM search_projection
            WHERE id IN (SELECT person_id FROM tmp_dirty_person_ids)
        )
        WHERE dni <> '';

        DELETE FROM dni_phone_agg
        WHERE dni IN (SELECT dni FROM tmp_dirty_dni);

        INSERT INTO dni_phone_agg(dni, phones)
        SELECT dni, group_concat(phone, ';')
        FROM (
            SELECT sp.dni AS dni, pi.phone AS phone
            FROM search_projection sp
            JOIN search_projection_phone_index pi ON pi.projection_id = sp.id
            WHERE sp.dni IN (SELECT dni FROM tmp_dirty_dni)
            GROUP BY sp.dni, pi.phone
            ORDER BY sp.dni, pi.phone
        )
        GROUP BY dni;

        DELETE FROM projection_dirty_person
        WHERE person_id IN (SELECT person_id FROM tmp_dirty_person_ids);
        "#,
    )?;

    tx.commit()?;
    println!("materialized serving tables");
    Ok(())
}
