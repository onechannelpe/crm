use super::common::{SELECT_COLUMNS, db_err, map_row};
use crate::errors::ApiError;
use crate::storage::sqlite::models::SearchRow;
use rusqlite::{Connection, Row, params};
use std::sync::LazyLock;

// Same standard columns, plus sibling_phones at col 30.
// Driving table is search_projection_phone_index.
static SQL_PHONE_ENRICHED: LazyLock<String> = LazyLock::new(|| {
    format!(
        "SELECT{SELECT_COLUMNS},
  CASE
    WHEN c.org_ruc IS NOT NULL AND c.org_ruc <> '' THEN rpa.phones
    ELSE dpa.phones
  END AS sibling_phones
FROM search_projection_phone_index pi
JOIN search_projection c ON c.id = pi.projection_id
LEFT JOIN ruc_phone_agg rpa ON rpa.org_ruc = c.org_ruc
LEFT JOIN dni_phone_agg dpa ON dpa.dni = c.dni
WHERE pi.phone = ?1
LIMIT ?2"
    )
});

pub fn search_phone_enriched(
    conn: &Connection,
    phone: &str,
    limit: usize,
) -> Result<Vec<SearchRow>, ApiError> {
    let mut stmt = conn.prepare_cached(&SQL_PHONE_ENRICHED).map_err(db_err)?;
    let rows = stmt
        .query_map(params![phone, limit as i64], map_row_with_siblings)
        .map_err(db_err)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(db_err)
}

fn map_row_with_siblings(row: &Row<'_>) -> rusqlite::Result<SearchRow> {
    let base = map_row(row)?;
    let siblings: Option<String> = row.get("sibling_phones")?;
    Ok(base.with_siblings(siblings))
}
