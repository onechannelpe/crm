use super::common::{SELECT_COLUMNS, query_rows};
use crate::errors::ApiError;
use crate::storage::sqlite::models::SearchRow;
use rusqlite::{Connection, params};
use std::sync::LazyLock;

// Both person and company FTS searches share the same SQL template; the field
// selector (person_name: / company_name:) is part of the ?1 parameter.
// Results are ordered by BM25 relevance (lower rank = better match in SQLite FTS5).
static SQL_FTS: LazyLock<String> = LazyLock::new(|| {
    format!(
        "SELECT{SELECT_COLUMNS}\nFROM search_projection c\nJOIN search_projection_fts f ON f.rowid = c.id WHERE search_projection_fts MATCH ?1 ORDER BY rank LIMIT ?2"
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

// Builds a FTS5 AND-prefix query from the validated text.
// Tokens >= 2 chars are included; 2-char tokens are allowed alongside longer
// ones to support partial second-word refinement (e.g. "garcia ro").
// validate_text in validation/input.rs guarantees at least one token >= 3
// chars before this is called, so the output is always non-empty.
fn fts_query(field: &str, text: &str) -> String {
    let tokens: Vec<String> = text
        .split_whitespace()
        .map(|t| {
            t.chars()
                .filter(|c| c.is_alphanumeric())
                .flat_map(|c| c.to_lowercase())
                .collect::<String>()
        })
        .filter(|t| t.len() >= 2)
        .collect();

    let mut out = String::new();
    for token in &tokens {
        if !out.is_empty() {
            out.push_str(" AND ");
        }
        out.push_str(field);
        out.push(':');
        out.push_str(token);
        out.push('*');
    }
    out
}
