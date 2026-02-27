use crate::errors::StartupError;
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::OpenFlags;

pub type SqlitePool = Pool<SqliteConnectionManager>;

pub fn make_pool(db_path: &str) -> Result<SqlitePool, StartupError> {
    let flags = OpenFlags::SQLITE_OPEN_READ_ONLY
        | OpenFlags::SQLITE_OPEN_URI
        | OpenFlags::SQLITE_OPEN_NO_MUTEX;
    // PRAGMAs are per-connection; with_init ensures every connection in the
    // pool receives them, not just the first one.
    let manager = SqliteConnectionManager::file(db_path)
        .with_flags(flags)
        .with_init(|conn| {
            conn.execute_batch(
                "
                PRAGMA query_only=ON;
                PRAGMA temp_store=MEMORY;
                PRAGMA cache_size=-20000;
                PRAGMA mmap_size=268435456;
                ",
            )
        });
    Pool::builder()
        .max_size(16)
        .build(manager)
        .map_err(|e| StartupError::Database(format!("pool init failed: {e}")))
}
