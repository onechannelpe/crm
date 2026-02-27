use crate::PipelineError;
use crate::config::runtime::EvidenceMode;
use crate::db::repo;
use crate::db::schema::open_rw;
use crate::stages::merge::shard::merge_one_shard;
use crate::stages::shard_ingest::IngestSession;

pub fn merge_ingest_session(
    db_path: &str,
    session: IngestSession,
    evidence_mode: EvidenceMode,
) -> Result<(), PipelineError> {
    let mut conn = open_rw(db_path)?;
    for shard_result in &session.shard_results {
        merge_one_shard(
            &mut conn,
            &shard_result.shard_db_path,
            session.snapshot_id,
            matches!(evidence_mode, EvidenceMode::Inline),
        )?;
    }

    if session.dispatched_rows != session.counters.total_rows {
        return fail_snapshot(
            db_path,
            session.snapshot_id,
            PipelineError::Args(format!(
                "sharded ingest row mismatch source={} dispatched={} merged_total={}",
                session.source_key, session.dispatched_rows, session.counters.total_rows
            )),
        );
    }

    let tx = conn.transaction()?;
    repo::persist_metrics(&tx, session.snapshot_id, &session.counters)?;
    tx.execute(
        "UPDATE source_snapshot SET status='completed' WHERE snapshot_id=?1",
        [session.snapshot_id],
    )?;
    tx.commit()?;

    println!(
        "{{\"snapshot_id\":{},\"total_rows\":{},\"accepted_rows\":{},\"invalid_dni_rows\":{},\"invalid_ruc_rows\":{},\"invalid_phone_rows\":{}}}",
        session.snapshot_id,
        session.counters.total_rows,
        session.counters.accepted_rows,
        session.counters.invalid_dni_rows,
        session.counters.invalid_ruc_rows,
        session.counters.invalid_phone_rows
    );
    Ok(())
}

pub fn fail_snapshot(db_path: &str, snapshot_id: i64, err: PipelineError) -> Result<(), PipelineError> {
    let mut conn = open_rw(db_path)?;
    let tx = conn.transaction()?;
    tx.execute(
        "UPDATE source_snapshot SET status='failed' WHERE snapshot_id=?1",
        [snapshot_id],
    )?;
    tx.commit()?;
    Err(err)
}
