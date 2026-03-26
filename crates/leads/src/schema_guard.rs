use rusqlite::{Connection, OptionalExtension};
use shared::error::StartupError;

const REQUIRED_COLUMNS: &[&str] = &[
    "id",
    "ruc",
    "dni",
    "organization_name",
    "person_name",
    "phone_primary",
    "source",
    "quality_tier",
    "product_tag",
    "branch_tag",
    "created_at",
    "updated_at",
    "active",
];

pub fn validate(conn: &Connection) -> Result<(), StartupError> {
    if !table_exists(conn, "leads")? {
        // leads.sqlite starts empty before the first import.
        create_leads_table(conn)?;
        tracing::info!("leads table created (first run)");
        return Ok(());
    }
    for col in REQUIRED_COLUMNS {
        if !table_has_column(conn, "leads", col)? {
            return Err(StartupError::Database(format!(
                "leads table is missing required column: {col}"
            )));
        }
    }
    Ok(())
}

fn create_leads_table(conn: &Connection) -> Result<(), StartupError> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS leads (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            ruc               TEXT    NOT NULL,
            dni               TEXT    NOT NULL,
            organization_name TEXT    NOT NULL DEFAULT '',
            person_name       TEXT    NOT NULL DEFAULT '',
            phone_primary     TEXT    NOT NULL DEFAULT '',
            source            TEXT    NOT NULL DEFAULT 'manual',
            quality_tier      INTEGER NOT NULL DEFAULT 1,
            product_tag       TEXT,
            branch_tag        INTEGER,
            created_at        INTEGER NOT NULL DEFAULT (unixepoch()),
            updated_at        INTEGER NOT NULL DEFAULT (unixepoch()),
            active            INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
            UNIQUE (ruc, dni)
        );
        CREATE INDEX IF NOT EXISTS leads_active_quality ON leads (active, quality_tier DESC, id);
        CREATE INDEX IF NOT EXISTS leads_branch_tag     ON leads (branch_tag, active);
        CREATE INDEX IF NOT EXISTS leads_product_tag    ON leads (product_tag, active);",
    )
    .map_err(|e| StartupError::Database(format!("failed to create leads table: {e}")))
}

fn table_exists(conn: &Connection, name: &str) -> Result<bool, StartupError> {
    conn.query_row(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?1",
        [name],
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
