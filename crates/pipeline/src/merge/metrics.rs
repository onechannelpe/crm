use crate::PipelineError;
use crate::ingest::IngestCounters;
use rusqlite::{Transaction, params};

pub(super) fn persist_metrics(
    tx: &Transaction<'_>,
    snapshot_id: i64,
    counters: &IngestCounters,
) -> Result<(), PipelineError> {
    let mut stmt = tx.prepare_cached(
        r#"
        INSERT INTO snapshot_metrics(
            snapshot_id, total_rows, accepted_rows, invalid_doc_rows, invalid_ruc_rows, invalid_phone_rows
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ON CONFLICT(snapshot_id) DO UPDATE SET
            total_rows=excluded.total_rows,
            accepted_rows=excluded.accepted_rows,
            invalid_doc_rows=excluded.invalid_doc_rows,
            invalid_ruc_rows=excluded.invalid_ruc_rows,
            invalid_phone_rows=excluded.invalid_phone_rows
        "#,
    )?;
    stmt.execute(params![
        snapshot_id,
        counters.total_rows,
        counters.accepted_rows,
        counters.invalid_doc_rows,
        counters.invalid_ruc_rows,
        counters.invalid_phone_rows
    ])?;
    Ok(())
}
