use crate::PipelineError;
use crate::db::schema::open_rw;
use std::fs;
use std::path::Path;

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

        CREATE INDEX IF NOT EXISTS idx_phone_index_phone ON phone_index(phone);
        CREATE INDEX IF NOT EXISTS idx_person_phone_phone ON person_phone(phone);
        CREATE INDEX IF NOT EXISTS idx_company_phone_phone ON company_phone(phone);
        CREATE INDEX IF NOT EXISTS idx_role_phone_phone ON role_phone(phone);
        "#,
    )?;

    tx.commit()?;
    println!("materialized serving tables");
    Ok(())
}

pub fn promote_db(from: &str, to: &str) -> Result<(), PipelineError> {
    if !Path::new(from).exists() {
        return Err(PipelineError::Args(format!(
            "source db does not exist: {from}"
        )));
    }
    let tmp = format!("{to}.tmp");
    fs::copy(from, &tmp)?;
    fs::rename(&tmp, to)?;
    println!("promoted db to {to}");
    Ok(())
}
