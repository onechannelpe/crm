use crate::error::StartupError;
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::OpenFlags;

pub type SqlitePool = Pool<SqliteConnectionManager>;

/// Read-only pool — for databases owned by another process (e.g. contacts.sqlite).
pub fn make_readonly_pool(db_path: &str) -> Result<SqlitePool, StartupError> {
    let flags = OpenFlags::SQLITE_OPEN_READ_ONLY
        | OpenFlags::SQLITE_OPEN_URI
        | OpenFlags::SQLITE_OPEN_NO_MUTEX;

    let manager = SqliteConnectionManager::file(db_path)
        .with_flags(flags)
        .with_init(|conn| {
            conn.execute_batch(
                "PRAGMA query_only = ON;
                 PRAGMA temp_store  = MEMORY;
                 PRAGMA cache_size  = -20000;
                 PRAGMA mmap_size   = 268435456;",
            )
        });

    Pool::builder()
        .max_size(16)
        .build(manager)
        .map_err(|e| StartupError::Database(format!("pool init failed: {e}")))
}

/// Read-write pool — for databases owned by this process (e.g. leads.sqlite).
pub fn make_pool(db_path: &str) -> Result<SqlitePool, StartupError> {
    let flags = OpenFlags::SQLITE_OPEN_READ_WRITE
        | OpenFlags::SQLITE_OPEN_CREATE
        | OpenFlags::SQLITE_OPEN_URI
        | OpenFlags::SQLITE_OPEN_NO_MUTEX;

    let manager = SqliteConnectionManager::file(db_path)
        .with_flags(flags)
        .with_init(|conn| {
            conn.execute_batch(
                "PRAGMA journal_mode = WAL;
                 PRAGMA synchronous  = NORMAL;
                 PRAGMA temp_store   = MEMORY;
                 PRAGMA cache_size   = -20000;
                 PRAGMA mmap_size    = 268435456;",
            )
        });

    Pool::builder()
        .max_size(16)
        .build(manager)
        .map_err(|e| StartupError::Database(format!("pool init failed: {e}")))
}
