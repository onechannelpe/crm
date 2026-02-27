use crate::PipelineError;
use crate::stages::shard_ingest::IngestCounters;
use rusqlite::{Transaction, params};

pub(crate) fn persist_metrics(
    tx: &Transaction<'_>,
    snapshot_id: i64,
    counters: &IngestCounters,
) -> Result<(), PipelineError> {
    let mut statement = tx.prepare_cached(
        r#"
        INSERT INTO snapshot_metrics(
            snapshot_id, total_rows, accepted_rows, invalid_dni_rows, invalid_ruc_rows, invalid_phone_rows
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ON CONFLICT(snapshot_id) DO UPDATE SET
            total_rows=excluded.total_rows,
            accepted_rows=excluded.accepted_rows,
            invalid_dni_rows=excluded.invalid_dni_rows,
            invalid_ruc_rows=excluded.invalid_ruc_rows,
            invalid_phone_rows=excluded.invalid_phone_rows
        "#,
    )?;
    statement.execute(params![
        snapshot_id,
        counters.total_rows,
        counters.accepted_rows,
        counters.invalid_dni_rows,
        counters.invalid_ruc_rows,
        counters.invalid_phone_rows
    ])?;
    Ok(())
}

pub(crate) fn upsert_snapshot(
    tx: &Transaction<'_>,
    source_key: &str,
    source_name: &str,
    snapshot_label: &str,
    snapshot_date: &str,
    file_path: &str,
    reliability_rank: i64,
) -> Result<i64, PipelineError> {
    let mut source_statement = tx.prepare_cached(
        r#"
        INSERT INTO source_registry(source_key, source_name, reliability_rank)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(source_key) DO UPDATE SET
            source_name=excluded.source_name,
            reliability_rank=excluded.reliability_rank
        RETURNING source_id
        "#,
    )?;
    let source_id: i64 = source_statement
        .query_row(params![source_key, source_name, reliability_rank], |row| {
            row.get(0)
        })?;

    let mut snapshot_statement = tx.prepare_cached(
        r#"
        INSERT INTO source_snapshot(source_id, snapshot_label, snapshot_date, file_path, status)
        VALUES (?1, ?2, ?3, ?4, 'registered')
        ON CONFLICT(source_id, snapshot_label) DO UPDATE SET
            snapshot_date=excluded.snapshot_date,
            file_path=excluded.file_path
        RETURNING snapshot_id
        "#,
    )?;
    let snapshot_id: i64 = snapshot_statement.query_row(
        params![source_id, snapshot_label, snapshot_date, file_path],
        |row| row.get(0),
    )?;
    Ok(snapshot_id)
}
