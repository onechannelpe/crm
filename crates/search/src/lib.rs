pub mod api;
pub mod contracts;
pub mod domain;
pub mod repo;
pub mod service;

mod company_projection_contract_generated;
mod doc_projection_contract_generated;
mod result_contract_generated;
mod schema_guard;

use rusqlite::Connection;
use shared::error::StartupError;

/// Validates the contacts SQLite schema against the search projection contract.
/// Call once at startup before the connection pool is handed to handlers.
pub fn validate_schema(conn: &Connection) -> Result<(), StartupError> {
    schema_guard::validate(conn)
}
