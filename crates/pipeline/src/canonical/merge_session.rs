use crate::PipelineError;
use crate::canonical::merge_shard::{MergeShardTimings, merge_one_shard};
use crate::canonical::repo;
use crate::canonical::schema::open_rw;
use crate::stages::shard_ingest::IngestSession;

#[derive(Default, Clone, Copy)]
pub struct MergePhaseStats {
    pub prepare_secs: f64,
    pub core_secs: f64,
    pub phone_secs: f64,
    pub email_secs: f64,
    pub cleanup_secs: f64,
    pub attach_detach_secs: f64,
}

pub fn merge_ingest_session(
    db_path: &str,
    session: IngestSession,
) -> Result<MergePhaseStats, PipelineError> {
    let mut conn = open_rw(db_path)?;
    let mut merge_stats = MergePhaseStats::default();
    for shard_result in &session.shard_results {
        let shard_timings: MergeShardTimings =
            merge_one_shard(&mut conn, &shard_result.shard_db_path, session.snapshot_id)?;
        merge_stats.core_secs += shard_timings.core_secs;
        merge_stats.phone_secs += shard_timings.phone_secs;
        merge_stats.email_secs += shard_timings.email_secs;
        merge_stats.prepare_secs += shard_timings.prepare_secs;
        merge_stats.cleanup_secs += shard_timings.cleanup_secs;
        merge_stats.attach_detach_secs += shard_timings.attach_detach_secs;
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
    repo::persist_metrics(&tx, session.snapshot_id, &session.counters)?;
    repo::set_snapshot_status(&tx, session.snapshot_id, "merged")?;
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
    Ok(merge_stats)
}

pub fn fail_snapshot(db_path: &str, snapshot_id: i64, err: PipelineError) -> PipelineError {
    if let Err(update_err) = mark_snapshot_failed(db_path, snapshot_id) {
        eprintln!(
            "[pipeline] warning: could not record snapshot {snapshot_id} failure in db: {update_err}"
        );
    }
    err
}

fn mark_snapshot_failed(db_path: &str, snapshot_id: i64) -> Result<(), PipelineError> {
    let mut conn = open_rw(db_path)?;
    let tx = conn.transaction()?;
    repo::set_snapshot_status(&tx, snapshot_id, "failed")?;
    tx.commit()?;
    Ok(())
}
