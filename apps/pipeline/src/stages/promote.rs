use crate::PipelineError;
use rusqlite::{Connection, params};
use std::fs;
use std::path::Path;

pub fn promote_db(from: &str, to: &str) -> Result<(), PipelineError> {
    if !Path::new(from).exists() {
        return Err(PipelineError::Args(format!(
            "source db does not exist: {from}"
        )));
    }
    let tmp = format!("{to}.tmp");
    if Path::new(&tmp).exists() {
        fs::remove_file(&tmp)?;
    }

    let conn = Connection::open(from)?;
    conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")?;
    conn.execute("VACUUM INTO ?1", params![tmp.as_str()])?;

    if Path::new(to).exists() {
        fs::remove_file(to)?;
    }
    let to_wal = format!("{to}-wal");
    let to_shm = format!("{to}-shm");
    if Path::new(&to_wal).exists() {
        fs::remove_file(&to_wal)?;
    }
    if Path::new(&to_shm).exists() {
        fs::remove_file(&to_shm)?;
    }
    fs::rename(&tmp, to)?;
    println!("promoted db to {to}");
    Ok(())
}
