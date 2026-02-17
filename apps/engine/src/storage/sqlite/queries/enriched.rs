use super::common::{db_err, map_row};
use crate::errors::ApiError;
use crate::storage::sqlite::models::SearchRow;
use rusqlite::{Connection, Row, params};

const SQL_PHONE_ENRICHED: &str = "
SELECT c.dni,
       COALESCE(NULLIF(c.name, ''), 'Contacto ' || c.dni) AS name,
       NULLIF(c.org_ruc, '') AS org_ruc,
       NULLIF(c.org_name, '') AS org_name,
       NULLIF(c.phone_primary, '') AS phone_primary,
       NULLIF(c.phone_secondary, '') AS phone_secondary,
       CASE
         WHEN c.org_ruc IS NOT NULL AND c.org_ruc <> '' THEN rpa.phones
         ELSE dpa.phones
       END AS sibling_phones
FROM phone_index p
JOIN contacts c ON c.id = p.contact_id
LEFT JOIN ruc_phone_agg rpa ON rpa.org_ruc = c.org_ruc
LEFT JOIN dni_phone_agg dpa ON dpa.dni = c.dni
WHERE p.phone = ?1
LIMIT ?2
";

pub fn search_phone_enriched(
    conn: &Connection,
    phone: &str,
    limit: usize,
) -> Result<Vec<SearchRow>, ApiError> {
    let mut stmt = conn.prepare_cached(SQL_PHONE_ENRICHED).map_err(db_err)?;
    let rows = stmt
        .query_map(params![phone, limit as i64], map_row_with_siblings)
        .map_err(db_err)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(db_err)
}

fn map_row_with_siblings(row: &Row<'_>) -> rusqlite::Result<SearchRow> {
    let base = map_row(row)?;
    let siblings: Option<String> = row.get(6)?;
    Ok(base.with_siblings(siblings))
}
