use crate::PipelineError;
use crate::stages::merge::sql::{
    MERGE_CLEANUP_SQL, MERGE_CORE_SQL, MERGE_EVIDENCE_COMPANY_SQL, MERGE_EVIDENCE_PERSON_SQL,
    MERGE_EVIDENCE_ROLE_SQL, MERGE_PHONE_SQL, MERGE_PREPARE_SQL,
};
use rusqlite::params;
use std::path::Path;
use std::time::Instant;

#[derive(Default, Clone, Copy)]
pub(super) struct MergeShardTimings {
    pub prepare_secs: f64,
    pub core_secs: f64,
    pub phone_secs: f64,
    pub evidence_secs: f64,
    pub cleanup_secs: f64,
    pub attach_detach_secs: f64,
}

pub(super) fn merge_one_shard(
    main_conn: &mut rusqlite::Connection,
    shard_db_path: &Path,
    snapshot_id: i64,
) -> Result<MergeShardTimings, PipelineError> {
    let tx = main_conn.transaction()?;
    let shard_path = shard_db_path.to_string_lossy().to_string();
    let mut timings = MergeShardTimings::default();

    let attach_started_at = Instant::now();
    tx.execute("ATTACH DATABASE ?1 AS shard", params![shard_path])?;
    timings.attach_detach_secs += attach_started_at.elapsed().as_secs_f64();

    let prepare_started_at = Instant::now();
    tx.execute_batch(MERGE_PREPARE_SQL)?;
    timings.prepare_secs = prepare_started_at.elapsed().as_secs_f64();

    let core_started_at = Instant::now();
    tx.execute_batch(MERGE_CORE_SQL)?;
    timings.core_secs = core_started_at.elapsed().as_secs_f64();

    let merge_phone_sql = MERGE_PHONE_SQL.replace("{snapshot_id}", &snapshot_id.to_string());
    let phone_started_at = Instant::now();
    tx.execute_batch(&merge_phone_sql)?;
    timings.phone_secs = phone_started_at.elapsed().as_secs_f64();

    let evidence_started_at = Instant::now();
    tx.execute(MERGE_EVIDENCE_PERSON_SQL, [snapshot_id])?;
    tx.execute(MERGE_EVIDENCE_COMPANY_SQL, [snapshot_id])?;
    tx.execute(MERGE_EVIDENCE_ROLE_SQL, [snapshot_id])?;
    timings.evidence_secs = evidence_started_at.elapsed().as_secs_f64();

    let cleanup_started_at = Instant::now();
    tx.execute_batch(MERGE_CLEANUP_SQL)?;
    timings.cleanup_secs = cleanup_started_at.elapsed().as_secs_f64();
    tx.commit()?;
    let detach_started_at = Instant::now();
    main_conn.execute("DETACH DATABASE shard", [])?;
    timings.attach_detach_secs += detach_started_at.elapsed().as_secs_f64();

    Ok(timings)
}
