use super::common::{JOIN_CHAIN, SELECT_COLUMNS, query_rows};
use crate::errors::ApiError;
use crate::storage::sqlite::models::SearchRow;
use rusqlite::{Connection, params};
use std::sync::LazyLock;

static SQL_DNI: LazyLock<String> = LazyLock::new(|| {
    format!(
        "SELECT{SELECT_COLUMNS}\nFROM contacts_serving c{JOIN_CHAIN}\nWHERE c.dni = ?1 LIMIT ?2"
    )
});

static SQL_RUC: LazyLock<String> = LazyLock::new(|| {
    format!(
        "SELECT{SELECT_COLUMNS}\nFROM contacts_serving c{JOIN_CHAIN}\nWHERE c.org_ruc = ?1 LIMIT ?2"
    )
});

// phone_index is an inner join — placed before the LEFT JOINs for optimizer clarity.
static SQL_PHONE: LazyLock<String> = LazyLock::new(|| {
    format!(
        "SELECT{SELECT_COLUMNS}\nFROM contacts_serving c\nJOIN phone_index p ON p.contact_id = c.id{JOIN_CHAIN}\nWHERE p.phone = ?1 LIMIT ?2"
    )
});

pub fn search_dni(conn: &Connection, dni: &str, limit: usize) -> Result<Vec<SearchRow>, ApiError> {
    query_rows(conn, &SQL_DNI, params![dni, limit as i64])
}

pub fn search_ruc(conn: &Connection, ruc: &str, limit: usize) -> Result<Vec<SearchRow>, ApiError> {
    query_rows(conn, &SQL_RUC, params![ruc, limit as i64])
}

pub fn search_phone(
    conn: &Connection,
    phone: &str,
    limit: usize,
) -> Result<Vec<SearchRow>, ApiError> {
    query_rows(conn, &SQL_PHONE, params![phone, limit as i64])
}
