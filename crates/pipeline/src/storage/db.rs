use crate::PipelineError;
use rusqlite::Connection;
use std::time::Duration;

pub fn open_rw(db_path: &str) -> Result<Connection, PipelineError> {
    let conn = Connection::open(db_path)?;
    conn.execute_batch(
        r#"
        PRAGMA journal_mode=WAL;
        PRAGMA synchronous=NORMAL;
        PRAGMA temp_store=MEMORY;
        PRAGMA cache_size=-262144;
        PRAGMA mmap_size=1073741824;
        PRAGMA wal_autocheckpoint=200000;
        PRAGMA foreign_keys=ON;
        "#,
    )?;
    conn.busy_timeout(Duration::from_secs(60))?;
    Ok(conn)
}
