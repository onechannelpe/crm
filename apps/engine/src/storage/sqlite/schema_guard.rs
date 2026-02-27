use crate::errors::StartupError;
use crate::storage::sqlite::projection_contract_generated::{
    SEARCH_PROJECTION_NAME, SEARCH_PROJECTION_PATHS, SEARCH_PROJECTION_STORAGE_MAPPINGS,
};
use rusqlite::{Connection, OptionalExtension};
use std::collections::HashSet;

const REQUIRED_TABLES: &[&str] = &[
    "search_projection",
    "search_projection_phone_index",
    "search_projection_fts",
    "ruc_phone_agg",
    "dni_phone_agg",
];
const REQUIRED_VIEWS: &[&str] = &[];

pub fn validate(conn: &Connection) -> Result<(), StartupError> {
    for name in REQUIRED_TABLES {
        if !sqlite_object_exists(conn, "table", name)? {
            return Err(StartupError::Database(format!(
                "missing required table: {name}"
            )));
        }
    }
    for name in REQUIRED_VIEWS {
        if !sqlite_object_exists(conn, "view", name)? {
            return Err(StartupError::Database(format!(
                "missing required view: {name}"
            )));
        }
    }

    validate_projection_paths()?;
    validate_required_columns(conn)?;
    Ok(())
}

fn validate_projection_paths() -> Result<(), StartupError> {
    if SEARCH_PROJECTION_NAME.trim().is_empty() {
        return Err(StartupError::Config(
            "projection contract must include a non-empty projection name".into(),
        ));
    }

    let mut seen = HashSet::new();

    for path in SEARCH_PROJECTION_PATHS {
        if !seen.insert(*path) {
            return Err(StartupError::Config(format!(
                "duplicate projection path in contract: {}",
                path
            )));
        }
    }

    Ok(())
}

fn validate_required_columns(conn: &Connection) -> Result<(), StartupError> {
    for mapping in SEARCH_PROJECTION_STORAGE_MAPPINGS {
        if mapping.table.trim().is_empty() || mapping.column.trim().is_empty() {
            return Err(StartupError::Config(format!(
                "projection path '{}' has invalid storage mapping",
                mapping.path
            )));
        }
        if !table_has_column(conn, mapping.table, mapping.column)? {
            return Err(StartupError::Database(format!(
                "missing required column for projection path '{}': {}.{}",
                mapping.path, mapping.table, mapping.column
            )));
        }
    }

    Ok(())
}

fn sqlite_object_exists(
    conn: &Connection,
    object_type: &str,
    name: &str,
) -> Result<bool, StartupError> {
    let exists: Option<String> = conn
        .query_row(
            "SELECT name FROM sqlite_master WHERE type=?1 AND name=?2",
            (object_type, name),
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| StartupError::Database(format!("schema check failed: {e}")))?;
    Ok(exists.is_some())
}

fn table_has_column(conn: &Connection, table: &str, column: &str) -> Result<bool, StartupError> {
    let sql = format!("PRAGMA table_info({table})");
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| StartupError::Database(format!("schema check failed: {e}")))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| StartupError::Database(format!("schema check failed: {e}")))?;

    for row in rows {
        let name = row.map_err(|e| StartupError::Database(format!("schema check failed: {e}")))?;
        if name == column {
            return Ok(true);
        }
    }
    Ok(false)
}
