use crate::PipelineError;
use crate::config::manifest::{SourceManifest, SourceManifestEntry, verify_manifest};
use crate::config::runtime::{EvidenceMode, IngestMode};
use crate::db::schema::open_rw;
use crate::stages::materialize::materialize_serving;
use crate::stages::merge::{fail_snapshot, merge_ingest_session};
use crate::stages::shard_ingest::ingest_to_shards;
use crate::stages::validate::validate_snapshot;
use std::path::Path;
use std::time::Instant;

pub(super) struct IngestPhaseStats {
    pub duration_secs: f64,
}

pub(super) fn load_enabled_sources(manifest_path: &str) -> Result<Vec<SourceManifestEntry>, PipelineError> {
    let SourceManifest { mut sources, .. } = verify_manifest(manifest_path)?;
    sources.retain(|source| source.enabled);
    sources.sort_by(|a, b| {
        b.priority
            .cmp(&a.priority)
            .then_with(|| a.source_key.cmp(&b.source_key))
    });
    Ok(sources)
}

#[allow(clippy::too_many_arguments)]
pub(super) fn run_ingest_phase(
    db_path: &str,
    mapping_path: &Path,
    input_path: &Path,
    snapshot_label: &str,
    snapshot_date: &str,
    batch_size: usize,
    workers: usize,
    ingest_mode: IngestMode,
    evidence_mode: EvidenceMode,
    source_key: Option<&str>,
) -> Result<IngestPhaseStats, PipelineError> {
    let ingest_started_at = Instant::now();
    println!(
        "[pipeline] ingest {snapshot_label} from {}",
        input_path.display()
    );

    let effective_workers = match ingest_mode {
        IngestMode::Single => 1,
        IngestMode::Sharded => workers,
    };

    let session = ingest_to_shards(
        db_path,
        &mapping_path.to_string_lossy(),
        &input_path.to_string_lossy(),
        snapshot_label,
        snapshot_date,
        batch_size,
        effective_workers,
    )?;

    let snapshot_id = session.snapshot_id;
    if let Err(err) = merge_ingest_session(db_path, session, evidence_mode) {
        fail_snapshot(db_path, snapshot_id, err)?;
        unreachable!();
    }

    validate_snapshot(db_path, snapshot_label)?;

    let duration_secs = ingest_started_at.elapsed().as_secs_f64();
    if let Some(source_key) = source_key {
        println!(
            "[pipeline] ingest_timing source_key={source_key} snapshot_label={snapshot_label} seconds={duration_secs:.3}",
        );
    } else {
        println!(
            "[pipeline] ingest_timing snapshot_label={snapshot_label} seconds={duration_secs:.3}"
        );
    }

    Ok(IngestPhaseStats { duration_secs })
}

pub(super) fn materialize_and_quick_check(db_path: &str) -> Result<(), PipelineError> {
    println!("[pipeline] materialize serving tables");
    materialize_serving(db_path)?;

    println!("[pipeline] quick checks");
    let conn = open_rw(db_path)?;
    for table in [
        "person_profile",
        "company_profile",
        "person_company_role",
        "role_phone",
        "contacts_serving",
        "phone_index",
    ] {
        let sql = format!("SELECT EXISTS(SELECT 1 FROM {table} LIMIT 1)");
        let has_rows: i64 = conn.query_row(&sql, [], |row| row.get(0))?;
        println!("{table}_has_rows={has_rows}");
    }
    let max_id: i64 = conn.query_row(
        "SELECT COALESCE(MAX(id), 0) FROM contacts_serving",
        [],
        |row| row.get(0),
    )?;
    println!("contacts_serving_max_id={max_id}");
    println!("[pipeline] done: {db_path}");
    Ok(())
}
