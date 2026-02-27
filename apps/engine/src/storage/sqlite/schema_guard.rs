use crate::errors::StartupError;
use rusqlite::{Connection, OptionalExtension};
use serde::Deserialize;
use std::collections::HashSet;
use std::fs;
use std::path::Path;

const REQUIRED_TABLES: &[&str] = &[
    "search_projection",
    "search_projection_phone_index",
    "search_projection_fts",
    "ruc_phone_agg",
    "dni_phone_agg",
];
const REQUIRED_VIEWS: &[&str] = &[];

const SUPPORTED_PROJECTION_PATHS: &[&str] = &[
    "person.dni",
    "person.name",
    "org.ruc",
    "org.name",
    "role.name",
    "role.start_date",
    "role.rep_doc_type",
    "role.rep_doc_number",
    "role.rep_name",
    "phones.primary",
    "phones.secondary",
    "phones.siblings",
];

#[derive(Debug, Deserialize)]
struct ProjectionContract {
    projection: String,
    fields: Vec<ProjectionField>,
}

#[derive(Debug, Deserialize)]
struct ProjectionField {
    path: String,
    canonical_fields: Vec<String>,
}

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

    let projection_contract = load_projection_contract()?;
    validate_projection_paths(&projection_contract)?;
    validate_required_columns(conn, &projection_contract)?;
    Ok(())
}

fn load_projection_contract() -> Result<ProjectionContract, StartupError> {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../contracts/search-projection.json");
    let raw = fs::read_to_string(&path).map_err(|e| {
        StartupError::Config(format!(
            "failed to read projection contract {}: {e}",
            path.display()
        ))
    })?;

    serde_json::from_str::<ProjectionContract>(&raw).map_err(|e| {
        StartupError::Config(format!(
            "failed to parse projection contract {}: {e}",
            path.display()
        ))
    })
}

fn validate_projection_paths(contract: &ProjectionContract) -> Result<(), StartupError> {
    if contract.projection.trim().is_empty() {
        return Err(StartupError::Config(
            "projection contract must include a non-empty projection name".into(),
        ));
    }

    let supported = SUPPORTED_PROJECTION_PATHS
        .iter()
        .copied()
        .collect::<HashSet<_>>();
    let mut seen = HashSet::new();

    for field in &contract.fields {
        if field.canonical_fields.is_empty() {
            return Err(StartupError::Config(format!(
                "projection field '{}' must include at least one canonical field",
                field.path
            )));
        }
        if !seen.insert(field.path.as_str()) {
            return Err(StartupError::Config(format!(
                "duplicate projection path in contract: {}",
                field.path
            )));
        }
        if !supported.contains(field.path.as_str()) {
            return Err(StartupError::Config(format!(
                "projection path not supported by engine: {}",
                field.path
            )));
        }
    }

    Ok(())
}

fn validate_required_columns(
    conn: &Connection,
    contract: &ProjectionContract,
) -> Result<(), StartupError> {
    for field in &contract.fields {
        let required_columns = required_columns_for_path(&field.path).ok_or_else(|| {
            StartupError::Config(format!(
                "missing schema requirements for projection path: {}",
                field.path
            ))
        })?;

        for (table, column) in required_columns {
            if !table_has_column(conn, table, column)? {
                return Err(StartupError::Database(format!(
                    "missing required column for projection path '{}': {}.{}",
                    field.path, table, column
                )));
            }
        }
    }

    Ok(())
}

fn required_columns_for_path(path: &str) -> Option<&'static [(&'static str, &'static str)]> {
    match path {
        "person.dni" => Some(&[("search_projection", "dni")]),
        "person.name" => Some(&[("search_projection", "name")]),
        "org.ruc" => Some(&[("search_projection", "org_ruc")]),
        "org.name" => Some(&[("search_projection", "org_name")]),
        "role.name" => Some(&[("search_projection", "role_name")]),
        "role.start_date" => Some(&[("search_projection", "role_start_date")]),
        "role.rep_doc_type" => Some(&[("search_projection", "rep_doc_type")]),
        "role.rep_doc_number" => Some(&[("search_projection", "rep_doc_number")]),
        "role.rep_name" => Some(&[("search_projection", "rep_name")]),
        "phones.primary" => Some(&[("search_projection", "phone_primary")]),
        "phones.secondary" => Some(&[("search_projection", "phone_secondary")]),
        "phones.siblings" => Some(&[("ruc_phone_agg", "phones"), ("dni_phone_agg", "phones")]),
        _ => None,
    }
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
