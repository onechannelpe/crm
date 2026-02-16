use super::common::{SELECT_BASE, query_rows};
use crate::errors::ApiError;
use crate::storage::sqlite::models::SearchRow;
use rusqlite::{Connection, params};

pub fn search_person_name(
    conn: &Connection,
    text: &str,
    limit: usize,
) -> Result<Vec<SearchRow>, ApiError> {
    let sql = format!(
        "{} JOIN contacts_fts f ON f.rowid = c.id WHERE contacts_fts MATCH ?1 LIMIT ?2",
        SELECT_BASE
    );
    query_rows(
        conn,
        &sql,
        params![fts_query("person_name", text), limit as i64],
    )
}

pub fn search_company_name(
    conn: &Connection,
    text: &str,
    limit: usize,
) -> Result<Vec<SearchRow>, ApiError> {
    let sql = format!(
        "{} JOIN contacts_fts f ON f.rowid = c.id WHERE contacts_fts MATCH ?1 LIMIT ?2",
        SELECT_BASE
    );
    query_rows(
        conn,
        &sql,
        params![fts_query("company_name", text), limit as i64],
    )
}

// We require prefix terms (`token*`) so operators can type partial names.
fn fts_query(field: &str, text: &str) -> String {
    let terms = text
        .split_whitespace()
        .filter_map(|token| {
            let cleaned: String = token
                .chars()
                .filter(|c| c.is_alphanumeric())
                .flat_map(|c| c.to_lowercase())
                .collect();
            (cleaned.len() >= 2).then(|| format!("{field}:{cleaned}*"))
        })
        .collect::<Vec<_>>();

    if terms.is_empty() {
        format!("{field}:*")
    } else {
        terms.join(" AND ")
    }
}
