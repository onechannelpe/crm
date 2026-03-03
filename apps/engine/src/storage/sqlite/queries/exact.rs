use super::common::{SELECT_COLUMNS, db_err, map_row_with_siblings, query_rows};
use crate::errors::ApiError;
use crate::storage::sqlite::models::SearchRow;
use rusqlite::{Connection, params};
use std::sync::LazyLock;

static SQL_DNI: LazyLock<String> = LazyLock::new(|| {
    format!("SELECT{SELECT_COLUMNS}\nFROM search_projection c\nWHERE c.dni = ?1 LIMIT ?2")
});

static SQL_RUC: LazyLock<String> = LazyLock::new(|| {
    format!(
        "SELECT{SELECT_COLUMNS},\n  rpa.phones AS sibling_phones\nFROM search_projection c\nLEFT JOIN ruc_phone_agg rpa ON rpa.org_ruc = c.org_ruc\nWHERE c.org_ruc = ?1 LIMIT ?2"
    )
});

static SQL_PHONE: LazyLock<String> = LazyLock::new(|| {
    format!(
        "SELECT{SELECT_COLUMNS}\nFROM search_projection c\nJOIN search_projection_phone_index p ON p.projection_id = c.id\nWHERE p.phone = ?1 LIMIT ?2"
    )
});

pub fn search_dni(conn: &Connection, dni: &str, limit: usize) -> Result<Vec<SearchRow>, ApiError> {
    query_rows(conn, &SQL_DNI, params![dni, limit as i64])
}

pub fn search_ruc(conn: &Connection, ruc: &str, limit: usize) -> Result<Vec<SearchRow>, ApiError> {
    let mut stmt = conn.prepare_cached(&SQL_RUC).map_err(db_err)?;
    let rows = stmt
        .query_map(params![ruc, limit as i64], map_row_with_siblings)
        .map_err(db_err)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(db_err)
}

pub fn search_phone(
    conn: &Connection,
    phone: &str,
    limit: usize,
) -> Result<Vec<SearchRow>, ApiError> {
    query_rows(conn, &SQL_PHONE, params![phone, limit as i64])
}
