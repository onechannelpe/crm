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

        DELETE FROM contacts_serving;
        DELETE FROM phone_index;
        DELETE FROM ruc_phone_agg;
        DELETE FROM dni_phone_agg;
        DELETE FROM contacts_fts;
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
        INSERT INTO contacts_serving(dni, name, org_ruc, org_name, phone_primary, phone_secondary)
        SELECT
            p.dni,
            p.full_name,
            c.ruc AS org_ruc,
            c.legal_name AS org_name,
            phones.phone_primary,
            phones.phone_secondary
        FROM person_profile p
        LEFT JOIN first_role role ON role.person_id = p.person_id
        LEFT JOIN company_profile c ON c.company_id = role.company_id
        LEFT JOIN top_two_phones phones ON phones.person_id = p.person_id
        WHERE p.dni IS NOT NULL AND p.dni <> '';

        CREATE INDEX IF NOT EXISTS idx_contacts_serving_dni ON contacts_serving(dni);
        CREATE INDEX IF NOT EXISTS idx_contacts_serving_ruc ON contacts_serving(org_ruc);

        INSERT INTO phone_index(phone, contact_id)
        SELECT DISTINCT pp.phone, cs.id
        FROM contacts_serving cs
        JOIN person_profile p ON p.dni = cs.dni
        JOIN person_phone pp ON pp.person_id = p.person_id;

        INSERT INTO ruc_phone_agg(org_ruc, phones)
        SELECT org_ruc, group_concat(phone, ';')
        FROM (
            SELECT cs.org_ruc AS org_ruc, pi.phone AS phone
            FROM contacts_serving cs
            JOIN phone_index pi ON pi.contact_id = cs.id
            WHERE cs.org_ruc IS NOT NULL AND cs.org_ruc <> ''
            GROUP BY cs.org_ruc, pi.phone
            ORDER BY cs.org_ruc, pi.phone
        )
        GROUP BY org_ruc;

        INSERT INTO dni_phone_agg(dni, phones)
        SELECT dni, group_concat(phone, ';')
        FROM (
            SELECT cs.dni AS dni, pi.phone AS phone
            FROM contacts_serving cs
            JOIN phone_index pi ON pi.contact_id = cs.id
            WHERE cs.dni IS NOT NULL AND cs.dni <> ''
            GROUP BY cs.dni, pi.phone
            ORDER BY cs.dni, pi.phone
        )
        GROUP BY dni;

        INSERT INTO contacts_fts(rowid, person_name, company_name)
        SELECT id, COALESCE(name,''), COALESCE(org_name,'')
        FROM contacts_serving;

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
            cs.id AS id,
            cs.dni AS dni,
            cs.name AS name,
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
            cs.org_ruc AS org_ruc,
            cs.org_name AS org_name,
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
            cs.phone_primary AS phone_primary,
            cs.phone_secondary AS phone_secondary
        FROM contacts_serving cs
        LEFT JOIN person_profile pp ON pp.dni = cs.dni
        LEFT JOIN company_profile cp ON cp.ruc = cs.org_ruc
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
        SELECT DISTINCT pi.phone, pi.contact_id
        FROM phone_index pi;

        INSERT INTO search_projection_fts(rowid, person_name, company_name)
        SELECT id, COALESCE(name,''), COALESCE(org_name,'')
        FROM search_projection;

        CREATE INDEX IF NOT EXISTS idx_phone_index_phone ON phone_index(phone);
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
