use super::common::{SELECT_BASE, query_rows};
use crate::errors::ApiError;
use crate::storage::sqlite::models::SearchRow;
use rusqlite::{Connection, params};

pub fn search_dni(conn: &Connection, dni: &str, limit: usize) -> Result<Vec<SearchRow>, ApiError> {
    let sql = format!("{SELECT_BASE} WHERE c.dni = ?1 LIMIT ?2");
    query_rows(conn, &sql, params![dni, limit as i64])
}

pub fn search_ruc(conn: &Connection, ruc: &str, limit: usize) -> Result<Vec<SearchRow>, ApiError> {
    let sql = format!("{SELECT_BASE} WHERE c.org_ruc = ?1 LIMIT ?2");
    query_rows(conn, &sql, params![ruc, limit as i64])
}

pub fn search_phone(
    conn: &Connection,
    phone: &str,
    limit: usize,
) -> Result<Vec<SearchRow>, ApiError> {
    let sql = format!(
        "{SELECT_BASE} JOIN phone_index p ON p.contact_id = c.id WHERE p.phone = ?1 LIMIT ?2"
    );
    query_rows(conn, &sql, params![phone, limit as i64])
}
