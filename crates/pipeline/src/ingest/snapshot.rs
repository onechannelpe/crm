use crate::PipelineError;
use crate::config::mapping::SourceMapping;
use crate::merge::snapshot::{set_snapshot_status, upsert_snapshot};
use crate::storage::db::open_rw;

pub(super) fn register_snapshot(
    db_path: &str,
    mapping: &SourceMapping,
    input_path: &str,
    snapshot_label: &str,
    snapshot_date: &str,
    reliability_rank: i64,
) -> Result<i64, PipelineError> {
    let mut conn = open_rw(db_path)?;
    let tx = conn.transaction()?;
    let snapshot_id = upsert_snapshot(
        &tx,
        &mapping.source_key,
        &mapping.source_name,
        snapshot_label,
        snapshot_date,
        input_path,
        reliability_rank,
    )?;
    set_snapshot_status(&tx, snapshot_id, "loading")?;
    tx.commit()?;
    Ok(snapshot_id)
}

pub(super) fn mark_snapshot_failed(db_path: &str, snapshot_id: i64) -> Result<(), PipelineError> {
    let mut conn = open_rw(db_path)?;
    let tx = conn.transaction()?;
    set_snapshot_status(&tx, snapshot_id, "failed")?;
    tx.commit()?;
    Ok(())
}

pub(super) fn sanitize_path_component(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for ch in value.chars() {
        if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
            out.push(ch);
        } else {
            out.push('_');
        }
    }
    out
}
