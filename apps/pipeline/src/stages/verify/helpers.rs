use crate::PipelineError;
use crate::config::manifest::{SourceManifest, SourceManifestEntry, verify_manifest};
use crate::config::runtime::IngestMode;
use crate::db::schema::open_rw;
use crate::stages::materialize::materialize_serving;
use crate::stages::merge::{fail_snapshot, merge_ingest_session};
use crate::stages::shard_ingest::ingest_to_shards;
use crate::stages::validate::validate_snapshot;
use std::path::Path;
use std::time::Instant;

pub(super) struct IngestPhaseStats {
    pub shard_ingest_secs: f64,
    pub merge_sql_secs: f64,
    pub merge_prepare_secs: f64,
    pub merge_core_secs: f64,
    pub merge_phone_secs: f64,
    pub merge_evidence_secs: f64,
    pub merge_cleanup_secs: f64,
    pub merge_attach_detach_secs: f64,
    pub validate_secs: f64,
    pub total_secs: f64,
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
    run_id: &str,
    mapping_path: &Path,
    input_path: &Path,
    snapshot_label: &str,
    snapshot_date: &str,
    reliability_rank: i64,
    batch_size: usize,
    workers: usize,
    ingest_mode: IngestMode,
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

    let shard_ingest_started_at = Instant::now();
    let session = ingest_to_shards(
        db_path,
        run_id,
        &mapping_path.to_string_lossy(),
        &input_path.to_string_lossy(),
        snapshot_label,
        snapshot_date,
        reliability_rank,
        batch_size,
        effective_workers,
    )?;
    let shard_ingest_secs = shard_ingest_started_at.elapsed().as_secs_f64();

    let snapshot_id = session.snapshot_id;
    let merge_sql_started_at = Instant::now();
    let merge_phase_stats = match merge_ingest_session(db_path, session) {
        Ok(stats) => stats,
        Err(err) => {
            fail_snapshot(db_path, snapshot_id, err)?;
            unreachable!();
        }
    };
    let merge_sql_secs = merge_sql_started_at.elapsed().as_secs_f64();
    let merge_prepare_secs = merge_phase_stats.prepare_secs;
    let merge_core_secs = merge_phase_stats.core_secs;
    let merge_phone_secs = merge_phase_stats.phone_secs;
    let merge_evidence_secs = merge_phase_stats.evidence_secs;
    let merge_cleanup_secs = merge_phase_stats.cleanup_secs;
    let merge_attach_detach_secs = merge_phase_stats.attach_detach_secs;

    let validate_started_at = Instant::now();
    validate_snapshot(db_path, snapshot_label)?;

    let mut conn = open_rw(db_path)?;
    let tx = conn.transaction()?;
    crate::db::repo::set_snapshot_status(&tx, snapshot_id, "validated")?;
    tx.commit()?;
    let validate_secs = validate_started_at.elapsed().as_secs_f64();

    let total_secs = ingest_started_at.elapsed().as_secs_f64();
    if let Some(source_key) = source_key {
        println!(
            "[pipeline] ingest_timing source_key={source_key} snapshot_label={snapshot_label} total_secs={total_secs:.3} shard_ingest_secs={shard_ingest_secs:.3} merge_sql_secs={merge_sql_secs:.3} merge_prepare_secs={merge_prepare_secs:.3} merge_core_secs={merge_core_secs:.3} merge_phone_secs={merge_phone_secs:.3} merge_evidence_secs={merge_evidence_secs:.3} merge_cleanup_secs={merge_cleanup_secs:.3} merge_attach_detach_secs={merge_attach_detach_secs:.3} validate_secs={validate_secs:.3}",
        );
    } else {
        println!(
            "[pipeline] ingest_timing snapshot_label={snapshot_label} total_secs={total_secs:.3} shard_ingest_secs={shard_ingest_secs:.3} merge_sql_secs={merge_sql_secs:.3} merge_prepare_secs={merge_prepare_secs:.3} merge_core_secs={merge_core_secs:.3} merge_phone_secs={merge_phone_secs:.3} merge_evidence_secs={merge_evidence_secs:.3} merge_cleanup_secs={merge_cleanup_secs:.3} merge_attach_detach_secs={merge_attach_detach_secs:.3} validate_secs={validate_secs:.3}"
        );
    }

    Ok(IngestPhaseStats {
        shard_ingest_secs,
        merge_sql_secs,
        merge_prepare_secs,
        merge_core_secs,
        merge_phone_secs,
        merge_evidence_secs,
        merge_cleanup_secs,
        merge_attach_detach_secs,
        validate_secs,
        total_secs,
    })
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

pub(super) fn mark_snapshots_materialized(db_path: &str) -> Result<(), PipelineError> {
    let conn = open_rw(db_path)?;
    conn.execute(
        "UPDATE source_snapshot SET status='materialized' WHERE status='validated'",
        [],
    )?;
    Ok(())
}
