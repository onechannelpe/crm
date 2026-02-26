use crate::PipelineError;
use crate::db::schema::open_rw;
use std::fs;
use std::path::Path;

pub fn materialize_serving(db_path: &str) -> Result<(), PipelineError> {
    let mut conn = open_rw(db_path)?;
    let tx = conn.transaction()?;
    tx.execute_batch(
        r#"
        DELETE FROM contacts_serving;
        DELETE FROM phone_index;
        DELETE FROM ruc_phone_agg;
        DELETE FROM dni_phone_agg;
        DELETE FROM contacts_fts;

        INSERT INTO contacts_serving(dni, name, org_ruc, org_name, phone_primary, phone_secondary)
        SELECT
            p.dni,
            p.full_name,
            (
                SELECT c.ruc
                FROM person_company_role r
                JOIN company_profile c ON c.company_id = r.company_id
                WHERE r.person_id = p.person_id
                ORDER BY r.role_id
                LIMIT 1
            ) AS org_ruc,
            (
                SELECT c.legal_name
                FROM person_company_role r
                JOIN company_profile c ON c.company_id = r.company_id
                WHERE r.person_id = p.person_id
                ORDER BY r.role_id
                LIMIT 1
            ) AS org_name,
            (
                SELECT pp.phone
                FROM person_phone pp
                WHERE pp.person_id = p.person_id
                ORDER BY pp.confidence DESC, pp.phone
                LIMIT 1
            ) AS phone_primary,
            (
                SELECT pp.phone
                FROM person_phone pp
                WHERE pp.person_id = p.person_id
                ORDER BY pp.confidence DESC, pp.phone
                LIMIT 1 OFFSET 1
            ) AS phone_secondary
        FROM person_profile p
        WHERE p.dni IS NOT NULL AND p.dni <> '';

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
