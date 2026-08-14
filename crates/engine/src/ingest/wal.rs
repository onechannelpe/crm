//! One-time journal mode conversion for contacts.sqlite.
//!
//! Databases produced by `pipeline promote` are in `delete` journal mode,
//! because `VACUUM INTO` writes a fresh file in the default mode. Under
//! `delete`, a writer takes an exclusive lock and every search query fails with
//! SQLITE_BUSY for the duration of a job. WAL is what lets the search pool read
//! while ingest writes.
//!
//! Switching modes needs an exclusive lock, so this must run before the
//! read-only search pool opens any connection. The change touches the file
//! header only; it does not rewrite the 37 GB of pages.

use rusqlite::{Connection, OpenFlags};
use shared::error::StartupError;

pub fn ensure_enabled(db_path: &str) -> Result<(), StartupError> {
    // No CREATE: a missing file is a deployment error, not something to paper
    // over with an empty database that would then fail the schema guard.
    let flags = OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_URI;
    let conn = Connection::open_with_flags(db_path, flags)
        .map_err(|e| StartupError::Database(format!("cannot open {db_path} for ingest: {e}")))?;

    let current = journal_mode(&conn, "PRAGMA journal_mode")?;
    if current.eq_ignore_ascii_case("wal") {
        return Ok(());
    }

    let switched = journal_mode(&conn, "PRAGMA journal_mode=WAL")?;
    if !switched.eq_ignore_ascii_case("wal") {
        return Err(StartupError::Database(format!(
            "could not switch {db_path} to WAL journal mode (still {switched}). \
             Another process is likely holding a lock on it."
        )));
    }

    tracing::info!(db_path, from = %current, "switched contacts database to WAL");
    Ok(())
}

/// `PRAGMA journal_mode` returns a row in both its read and write forms, so
/// neither can go through `execute`.
fn journal_mode(conn: &Connection, sql: &str) -> Result<String, StartupError> {
    conn.query_row(sql, [], |row| row.get::<_, String>(0))
        .map_err(|e| StartupError::Database(format!("{sql} failed: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn delete_mode_db() -> (tempfile::TempDir, String) {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir
            .path()
            .join("contacts.sqlite")
            .to_string_lossy()
            .into_owned();
        let conn = Connection::open(&path).expect("create db");
        conn.execute_batch("PRAGMA journal_mode=DELETE; CREATE TABLE t(x);")
            .expect("seed");
        drop(conn);
        (dir, path)
    }

    #[test]
    fn converts_a_delete_mode_database_to_wal() {
        let (_dir, path) = delete_mode_db();

        ensure_enabled(&path).expect("convert");

        let conn = Connection::open(&path).expect("reopen");
        let mode: String = conn
            .query_row("PRAGMA journal_mode", [], |row| row.get(0))
            .expect("read mode");
        assert_eq!(mode.to_lowercase(), "wal");
    }

    #[test]
    fn is_a_no_op_on_a_database_already_in_wal() {
        let (_dir, path) = delete_mode_db();
        ensure_enabled(&path).expect("first conversion");

        ensure_enabled(&path).expect("second call must succeed unchanged");

        let conn = Connection::open(&path).expect("reopen");
        let mode: String = conn
            .query_row("PRAGMA journal_mode", [], |row| row.get(0))
            .expect("read mode");
        assert_eq!(mode.to_lowercase(), "wal");
    }

    #[test]
    fn refuses_to_create_a_missing_database() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir
            .path()
            .join("absent.sqlite")
            .to_string_lossy()
            .into_owned();

        assert!(ensure_enabled(&path).is_err());
        assert!(!std::path::Path::new(&path).exists());
    }
}
