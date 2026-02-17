use crate::errors::ApiError;
use crate::storage::sqlite::models::SearchRow;
use rusqlite::{Connection, Row};

pub const SELECT_BASE: &str = "
SELECT c.dni,
       COALESCE(NULLIF(c.name, ''), 'Contacto ' || c.dni) AS name,
       NULLIF(c.org_ruc, '') AS org_ruc,
       NULLIF(c.org_name, '') AS org_name,
       NULLIF(c.phone_primary, '') AS phone_primary,
       NULLIF(c.phone_secondary, '') AS phone_secondary
FROM contacts c
";

pub fn query_rows<P>(conn: &Connection, sql: &str, params: P) -> Result<Vec<SearchRow>, ApiError>
where
    P: rusqlite::Params,
{
    let mut stmt = conn.prepare_cached(sql).map_err(db_err)?;
    let rows = stmt.query_map(params, map_row).map_err(db_err)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(db_err)
}

pub fn map_row(row: &Row<'_>) -> rusqlite::Result<SearchRow> {
    Ok(SearchRow {
        dni: row.get(0)?,
        name: row.get(1)?,
        org_ruc: row.get(2)?,
        org_name: row.get(3)?,
        phone_primary: row.get(4)?,
        phone_secondary: row.get(5)?,
        sibling_phones: None,
    })
}

pub fn db_err(e: rusqlite::Error) -> ApiError {
    ApiError::Service(format!("database query failed: {e}"))
}
