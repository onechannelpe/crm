pub mod api;
pub mod contracts;
pub mod domain;
pub mod repo;
pub mod service;

mod contracts_generated;
mod schema_guard;

use rusqlite::Connection;
use shared::error::StartupError;

/// Validates (and auto-creates on first run) the leads SQLite schema.
/// Call once at startup before the connection pool is handed to handlers.
pub fn validate_schema(conn: &Connection) -> Result<(), StartupError> {
    schema_guard::validate(conn)
}
