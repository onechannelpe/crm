//! Merge staged shard rows into the durable pipeline store.
//!
//! The merge capability owns snapshot state, merge metrics, and shard SQL
//! execution. Callers provide a completed ingest session and receive phase
//! timings for orchestration logs.

mod metrics;
mod shard;
pub mod snapshot;
pub mod stats;

use crate::PipelineError;
use crate::ingest::IngestSession;
use crate::storage::db::open_rw;
use metrics::persist_metrics;
use snapshot::{mark_snapshot_failed, set_snapshot_status};
use stats::MergePhaseStats;

pub fn merge_ingest_session(
    db_path: &str,
    session: IngestSession,
) -> Result<MergePhaseStats, PipelineError> {
    let mut conn = open_rw(db_path)?;
    let mut stats = MergePhaseStats::default();

    for shard_result in &session.shard_results {
        let shard_stats =
            shard::merge_one_shard(&mut conn, &shard_result.shard_db_path, session.snapshot_id)?;
        stats.prepare_secs += shard_stats.prepare_secs;
        stats.core_secs += shard_stats.core_secs;
        stats.phone_secs += shard_stats.phone_secs;
        stats.email_secs += shard_stats.email_secs;
        stats.cleanup_secs += shard_stats.cleanup_secs;
        stats.attach_detach_secs += shard_stats.attach_detach_secs;
    }

    if session.dispatched_rows != session.counters.total_rows {
        return Err(fail_snapshot(
            db_path,
            session.snapshot_id,
            PipelineError::Args(format!(
                "sharded ingest row mismatch source={} dispatched={} merged_total={}",
                session.source_key, session.dispatched_rows, session.counters.total_rows
            )),
        ));
    }

    let tx = conn.transaction()?;
    persist_metrics(&tx, session.snapshot_id, &session.counters)?;
    set_snapshot_status(&tx, session.snapshot_id, "merged")?;
    tx.commit()?;

    println!(
        "{{\"snapshot_id\":{},\"total_rows\":{},\"accepted_rows\":{},\"invalid_doc_rows\":{},\"invalid_ruc_rows\":{},\"invalid_phone_rows\":{}}}",
        session.snapshot_id,
        session.counters.total_rows,
        session.counters.accepted_rows,
        session.counters.invalid_doc_rows,
        session.counters.invalid_ruc_rows,
        session.counters.invalid_phone_rows
    );
    Ok(stats)
}

pub fn fail_snapshot(db_path: &str, snapshot_id: i64, err: PipelineError) -> PipelineError {
    if let Err(update_err) = mark_snapshot_failed(db_path, snapshot_id) {
        eprintln!(
            "[pipeline] warning: could not record snapshot {snapshot_id} failure in db: {update_err}"
        );
    }
    err
}
