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

        DELETE FROM ruc_phone_agg;
        DELETE FROM dni_phone_agg;
        DELETE FROM search_projection;
        DELETE FROM search_projection_phone_index;
        DELETE FROM search_projection_fts;

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
            pp.birth_date AS birth_date,
            pp.birth_place AS birth_place,
            pp.sex AS sex,
            pp.marital_status AS marital_status,
            pp.location_text AS location_text,
            pp.ubigeo_code AS ubigeo_code,
            pp.mother_name AS mother_name,
            pp.father_name AS father_name,
            pp.email AS email,
            pp.natural_ruc10 AS person_ruc,
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
            pcr.role_name AS role_name,
            pcr.role_start_date AS role_start_date,
            pcr.rep_doc_type AS rep_doc_type,
            pcr.rep_doc_number AS rep_doc_number,
            pcr.rep_name AS rep_name,
            phones.phone_primary AS phone_primary,
            phones.phone_secondary AS phone_secondary
        FROM person_profile p
        LEFT JOIN person_profile pp ON pp.person_id = p.person_id
        LEFT JOIN first_role role ON role.person_id = p.person_id
        LEFT JOIN company_profile cp ON cp.company_id = role.company_id
        LEFT JOIN top_two_phones phones ON phones.person_id = p.person_id
        LEFT JOIN person_company_role pcr
            ON pcr.person_id = pp.person_id
            AND pcr.company_id = cp.company_id
            AND pcr.role_id = (
                SELECT MIN(r2.role_id)
                FROM person_company_role r2
                WHERE r2.person_id = pp.person_id
                  AND r2.company_id = cp.company_id
            );
        
        INSERT INTO search_projection_phone_index(phone, projection_id)
        SELECT DISTINCT pp.phone, pp.person_id
        FROM person_phone pp
        JOIN search_projection sp ON sp.id = pp.person_id;

        INSERT INTO ruc_phone_agg(org_ruc, phones)
        SELECT org_ruc, group_concat(phone, ';')
        FROM (
            SELECT sp.org_ruc AS org_ruc, pi.phone AS phone
            FROM search_projection sp
            JOIN search_projection_phone_index pi ON pi.projection_id = sp.id
            WHERE sp.org_ruc IS NOT NULL AND sp.org_ruc <> ''
            GROUP BY sp.org_ruc, pi.phone
            ORDER BY sp.org_ruc, pi.phone
        )
        GROUP BY org_ruc;

        INSERT INTO dni_phone_agg(dni, phones)
        SELECT dni, group_concat(phone, ';')
        FROM (
            SELECT sp.dni AS dni, pi.phone AS phone
            FROM search_projection sp
            JOIN search_projection_phone_index pi ON pi.projection_id = sp.id
            WHERE sp.dni IS NOT NULL AND sp.dni <> ''
            GROUP BY sp.dni, pi.phone
            ORDER BY sp.dni, pi.phone
        )
        GROUP BY dni;

        INSERT INTO search_projection_fts(rowid, person_name, company_name)
        SELECT id, COALESCE(name,''), COALESCE(org_name,'')
        FROM search_projection;

        CREATE INDEX IF NOT EXISTS idx_search_projection_dni ON search_projection(dni);
        CREATE INDEX IF NOT EXISTS idx_search_projection_ruc ON search_projection(org_ruc);
        CREATE INDEX IF NOT EXISTS idx_search_projection_phone_index_phone
            ON search_projection_phone_index(phone);
        CREATE INDEX IF NOT EXISTS idx_person_phone_phone ON person_phone(phone);
        CREATE INDEX IF NOT EXISTS idx_company_phone_phone ON company_phone(phone);
        CREATE INDEX IF NOT EXISTS idx_role_phone_phone ON role_phone(phone);
        "#,
    )?;

    tx.commit()?;
    println!("materialized serving tables");
    Ok(())
}
