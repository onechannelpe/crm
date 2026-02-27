use crate::errors::StartupError;
use rusqlite::{Connection, OptionalExtension};

const REQUIRED_TABLES: &[&str] = &[
    "contacts_serving",
    "person_profile",
    "company_profile",
    "person_company_role",
    "phone_index",
    "contacts_fts",
    "ruc_phone_agg",
    "dni_phone_agg",
];

pub fn validate(conn: &Connection) -> Result<(), StartupError> {
    for name in REQUIRED_TABLES {
        let exists: Option<String> = conn
            .query_row(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?1",
                [name],
                |r| r.get(0),
            )
            .optional()
            .map_err(|e| StartupError::Database(format!("schema check failed: {e}")))?;

        if exists.is_none() {
            return Err(StartupError::Database(format!(
                "missing required table: {name}"
            )));
        }
    }
    Ok(())
}
