use crate::PipelineError;
use crate::storage::db::open_rw;
use rusqlite::{Transaction, params};

pub(crate) fn upsert_snapshot(
    tx: &Transaction<'_>,
    source_key: &str,
    source_name: &str,
    snapshot_label: &str,
    snapshot_date: &str,
    file_path: &str,
    reliability_rank: i64,
) -> Result<i64, PipelineError> {
    let mut source_stmt = tx.prepare_cached(
        r#"
        INSERT INTO source_registry(source_key, source_name, reliability_rank)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(source_key) DO UPDATE SET
            source_name=excluded.source_name,
            reliability_rank=excluded.reliability_rank
        RETURNING source_id
        "#,
    )?;

    let source_id: i64 = source_stmt
        .query_row(params![source_key, source_name, reliability_rank], |row| {
            row.get(0)
        })?;

    let mut snapshot_stmt = tx.prepare_cached(
        r#"
        INSERT INTO source_snapshot(source_id, snapshot_label, snapshot_date, file_path, status)
        VALUES (?1, ?2, ?3, ?4, 'registered')
        ON CONFLICT(source_id, snapshot_label) DO UPDATE SET
            snapshot_date=excluded.snapshot_date,
            file_path=excluded.file_path
        RETURNING snapshot_id
        "#,
    )?;

    snapshot_stmt
        .query_row(
            params![source_id, snapshot_label, snapshot_date, file_path],
            |row| row.get(0),
        )
        .map_err(Into::into)
}

pub(crate) fn set_snapshot_status(
    tx: &Transaction<'_>,
    snapshot_id: i64,
    status: &str,
) -> Result<(), PipelineError> {
    tx.execute(
        "UPDATE source_snapshot SET status=?2 WHERE snapshot_id=?1",
        params![snapshot_id, status],
    )?;

    Ok(())
}

pub fn record_snapshot_status(
    db_path: &str,
    snapshot_id: i64,
    status: &str,
) -> Result<(), PipelineError> {
    let mut conn = open_rw(db_path)?;
    let tx = conn.transaction()?;

    set_snapshot_status(&tx, snapshot_id, status)?;
    tx.commit()?;

    Ok(())
}

pub fn mark_snapshot_failed(db_path: &str, snapshot_id: i64) -> Result<(), PipelineError> {
    record_snapshot_status(db_path, snapshot_id, "failed")
}
