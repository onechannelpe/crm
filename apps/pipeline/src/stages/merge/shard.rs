use crate::PipelineError;
use crate::stages::merge::sql::{
    MERGE_CLEANUP_SQL, MERGE_CORE_SQL, MERGE_EVIDENCE_COMPANY_SQL, MERGE_EVIDENCE_PERSON_SQL,
    MERGE_EVIDENCE_ROLE_SQL, MERGE_PHONE_SQL, MERGE_PREPARE_SQL,
};
use rusqlite::params;
use std::path::Path;

pub(super) fn merge_one_shard(
    main_conn: &mut rusqlite::Connection,
    shard_db_path: &Path,
    snapshot_id: i64,
    include_evidence: bool,
) -> Result<(), PipelineError> {
    let tx = main_conn.transaction()?;
    let shard_path = shard_db_path.to_string_lossy().to_string();

    tx.execute("ATTACH DATABASE ?1 AS shard", params![shard_path])?;
    tx.execute_batch(MERGE_PREPARE_SQL)?;
    tx.execute_batch(MERGE_CORE_SQL)?;

    let merge_phone_sql = MERGE_PHONE_SQL.replace("{snapshot_id}", &snapshot_id.to_string());
    tx.execute_batch(&merge_phone_sql)?;

    if include_evidence {
        tx.execute(MERGE_EVIDENCE_PERSON_SQL, [snapshot_id])?;
        tx.execute(MERGE_EVIDENCE_COMPANY_SQL, [snapshot_id])?;
        tx.execute(MERGE_EVIDENCE_ROLE_SQL, [snapshot_id])?;
    }

    tx.execute_batch(MERGE_CLEANUP_SQL)?;
    tx.commit()?;
    main_conn.execute("DETACH DATABASE shard", [])?;

    Ok(())
}
