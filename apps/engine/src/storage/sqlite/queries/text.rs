use super::common::{SELECT_COLUMNS, query_rows};
use crate::errors::ApiError;
use crate::storage::sqlite::models::SearchRow;
use rusqlite::{Connection, params};
use std::sync::LazyLock;

// Both person and company FTS searches share the same SQL template; the field
// selector (person_name: / company_name:) is part of the ?1 parameter.
static SQL_FTS: LazyLock<String> = LazyLock::new(|| {
    format!(
        "SELECT{SELECT_COLUMNS}\nFROM search_projection c\nJOIN contacts_fts f ON f.rowid = c.id WHERE contacts_fts MATCH ?1 LIMIT ?2"
    )
});

pub fn search_person_name(
    conn: &Connection,
    text: &str,
    limit: usize,
) -> Result<Vec<SearchRow>, ApiError> {
    query_rows(
        conn,
        &SQL_FTS,
        params![fts_query("person_name", text), limit as i64],
    )
}

pub fn search_company_name(
    conn: &Connection,
    text: &str,
    limit: usize,
) -> Result<Vec<SearchRow>, ApiError> {
    query_rows(
        conn,
        &SQL_FTS,
        params![fts_query("company_name", text), limit as i64],
    )
}

// We require prefix terms (`token*`) so operators can type partial names.
fn fts_query(field: &str, text: &str) -> String {
    let mut out = String::new();
    let mut first = true;
    for token in text.split_whitespace() {
        let cleaned: String = token
            .chars()
            .filter(|c| c.is_alphanumeric())
            .flat_map(|c| c.to_lowercase())
            .collect();
        if cleaned.len() >= 2 {
            if !first {
                out.push_str(" AND ");
            }
            out.push_str(field);
            out.push(':');
            out.push_str(&cleaned);
            out.push('*');
            first = false;
        }
    }
    if first {
        // no valid tokens — match anything in the field
        format!("{field}:*")
    } else {
        out
    }
}
