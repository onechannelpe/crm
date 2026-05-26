use rusqlite::{Connection, OptionalExtension};
use shared::error::StartupError;
use std::collections::HashSet;

const REQUIRED_TABLES: &[&str] = &[
    "doc_projection",
    "doc_projection_phone_index",
    "doc_projection_fts",
    "company_projection",
    "company_projection_phone_index",
    "company_projection_fts",
    "ruc_phone_agg",
    "doc_phone_agg",
];

pub fn validate(conn: &Connection) -> Result<(), StartupError> {
    for name in REQUIRED_TABLES {
        if !object_exists(conn, "table", name)? {
            return Err(StartupError::Database(format!(
                "missing required table: {name}\n  \
                contacts.sqlite is missing or was built by an older pipeline.\n  \
                Refresh it with: bun run pipeline:refresh"
            )));
        }
    }
    validate_doc_paths()?;
    validate_company_paths()?;
    validate_doc_columns(conn)?;
    validate_company_columns(conn)?;
    Ok(())
}

fn validate_doc_paths() -> Result<(), StartupError> {
    use crate::doc_projection_contract_generated::{
        DOC_PROJECTION_NAME, DOC_PROJECTION_NULLABLE_PATHS, DOC_PROJECTION_PATHS,
    };
    if DOC_PROJECTION_NAME.trim().is_empty() {
        return Err(StartupError::Config(
            "doc projection contract must include a non-empty projection name".into(),
        ));
    }
    let mut seen = HashSet::new();
    for path in DOC_PROJECTION_PATHS {
        if !seen.insert(*path) {
            return Err(StartupError::Config(format!(
                "duplicate path in doc projection contract: {path}"
            )));
        }
    }
    for path in DOC_PROJECTION_NULLABLE_PATHS {
        if !seen.contains(path) {
            return Err(StartupError::Config(format!(
                "nullable path not in doc projection path set: {path}"
            )));
        }
    }
    Ok(())
}

fn validate_company_paths() -> Result<(), StartupError> {
    use crate::company_projection_contract_generated::{
        COMPANY_PROJECTION_NAME, COMPANY_PROJECTION_NULLABLE_PATHS, COMPANY_PROJECTION_PATHS,
    };
    if COMPANY_PROJECTION_NAME.trim().is_empty() {
        return Err(StartupError::Config(
            "company projection contract must include a non-empty projection name".into(),
        ));
    }
    let mut seen = HashSet::new();
    for path in COMPANY_PROJECTION_PATHS {
        if !seen.insert(*path) {
            return Err(StartupError::Config(format!(
                "duplicate path in company projection contract: {path}"
            )));
        }
    }
    for path in COMPANY_PROJECTION_NULLABLE_PATHS {
        if !seen.contains(path) {
            return Err(StartupError::Config(format!(
                "nullable path not in company projection path set: {path}"
            )));
        }
    }
    Ok(())
}

fn validate_doc_columns(conn: &Connection) -> Result<(), StartupError> {
    use crate::doc_projection_contract_generated::DOC_PROJECTION_STORAGE_MAPPINGS;
    for mapping in DOC_PROJECTION_STORAGE_MAPPINGS {
        if mapping.table.trim().is_empty() || mapping.column.trim().is_empty() {
            return Err(StartupError::Config(format!(
                "doc projection path '{}' has invalid storage mapping",
                mapping.path
            )));
        }
        if !table_has_column(conn, mapping.table, mapping.column)? {
            return Err(StartupError::Database(format!(
                "missing column for doc projection path '{}': {}.{}",
                mapping.path, mapping.table, mapping.column
            )));
        }
    }
    Ok(())
}

fn validate_company_columns(conn: &Connection) -> Result<(), StartupError> {
    use crate::company_projection_contract_generated::COMPANY_PROJECTION_STORAGE_MAPPINGS;
    for mapping in COMPANY_PROJECTION_STORAGE_MAPPINGS {
        if mapping.table.trim().is_empty() || mapping.column.trim().is_empty() {
            return Err(StartupError::Config(format!(
                "company projection path '{}' has invalid storage mapping",
                mapping.path
            )));
        }
        if !table_has_column(conn, mapping.table, mapping.column)? {
            return Err(StartupError::Database(format!(
                "missing column for company projection path '{}': {}.{}",
                mapping.path, mapping.table, mapping.column
            )));
        }
    }
    Ok(())
}

fn object_exists(conn: &Connection, kind: &str, name: &str) -> Result<bool, StartupError> {
    conn.query_row(
        "SELECT name FROM sqlite_master WHERE type=?1 AND name=?2",
        (kind, name),
        |r| r.get::<_, String>(0),
    )
    .optional()
    .map(|v| v.is_some())
    .map_err(|e| StartupError::Database(format!("schema check failed: {e}")))
}

fn table_has_column(conn: &Connection, table: &str, column: &str) -> Result<bool, StartupError> {
    let sql = format!("PRAGMA table_info({table})");
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| StartupError::Database(format!("schema check failed: {e}")))?;
    let found = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| StartupError::Database(format!("schema check failed: {e}")))?
        .any(|r| r.map(|n| n == column).unwrap_or(false));
    Ok(found)
}
