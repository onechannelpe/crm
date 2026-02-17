use crate::errors::StartupError;
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::OpenFlags;

pub type SqlitePool = Pool<SqliteConnectionManager>;

pub fn make_pool(db_path: &str) -> Result<SqlitePool, StartupError> {
    let flags = OpenFlags::SQLITE_OPEN_READ_ONLY
        | OpenFlags::SQLITE_OPEN_URI
        | OpenFlags::SQLITE_OPEN_NO_MUTEX;
    let manager = SqliteConnectionManager::file(db_path).with_flags(flags);
    let pool = Pool::builder()
        .max_size(16)
        .build(manager)
        .map_err(|e| StartupError::Database(format!("pool init failed: {e}")))?;

    let conn = pool
        .get()
        .map_err(|e| StartupError::Database(format!("pool get failed: {e}")))?;
    conn.execute_batch(
        "
        PRAGMA query_only=ON;
        PRAGMA temp_store=MEMORY;
        PRAGMA cache_size=-20000;
        PRAGMA mmap_size=268435456;
        ",
    )
    .map_err(|e| StartupError::Database(format!("pragma apply failed: {e}")))?;

    Ok(pool)
}
