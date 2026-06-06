use crate::PipelineError;
use crate::ingest::{ShardIngestConfig, ingest_to_shards};
use crate::materialize::materialize_serving;
use crate::merge;
use crate::merge::snapshot::set_snapshot_status;
use crate::merge::stats::MergePhaseStats;
use crate::storage::db::open_rw;
use crate::validate::validate_snapshot;
use std::path::Path;
use std::time::Instant;

use super::context::PhaseTiming;

pub(super) struct IngestPhaseStats {
    pub shard_ingest_secs: f64,
    pub merge_sql_secs: f64,
    pub merge_prepare_secs: f64,
    pub merge_core_secs: f64,
    pub merge_phone_secs: f64,
    pub merge_email_secs: f64,
    pub merge_cleanup_secs: f64,
    pub merge_attach_detach_secs: f64,
    pub validate_secs: f64,
    pub total_secs: f64,
}

pub(super) struct IngestPhaseConfig<'a> {
    pub db_path: &'a str,
    pub run_id: &'a str,
    pub mapping_path: &'a Path,
    pub input_path: &'a Path,
    pub snapshot_label: &'a str,
    pub snapshot_date: &'a str,
    pub reliability_rank: i64,
    pub batch_size: usize,
    pub workers: usize,
    pub source_key: Option<&'a str>,
}

pub(super) fn push_ingest_timings(
    timings: &mut Vec<PhaseTiming>,
    source_key: &str,
    stats: &IngestPhaseStats,
) {
    let phases: &[(&str, f64)] = &[
        ("shard_ingest", stats.shard_ingest_secs),
        ("merge_sql", stats.merge_sql_secs),
        ("merge_prepare", stats.merge_prepare_secs),
        ("merge_core", stats.merge_core_secs),
        ("merge_phone", stats.merge_phone_secs),
        ("merge_email", stats.merge_email_secs),
        ("merge_cleanup", stats.merge_cleanup_secs),
        ("merge_attach_detach", stats.merge_attach_detach_secs),
        ("validate", stats.validate_secs),
        ("ingest_total", stats.total_secs),
    ];
    for (phase, seconds) in phases {
        timings.push(PhaseTiming {
            phase: (*phase).to_owned(),
            key: source_key.to_owned(),
            seconds: *seconds,
        });
    }
}

pub(super) fn run_ingest_phase(
    config: &IngestPhaseConfig<'_>,
) -> Result<IngestPhaseStats, PipelineError> {
    let ingest_started_at = Instant::now();
    println!(
        "[pipeline] ingest {} from {}",
        config.snapshot_label,
        config.input_path.display()
    );

    let shard_ingest_started_at = Instant::now();
    let session = ingest_to_shards(ShardIngestConfig {
        db_path: config.db_path,
        run_id: config.run_id,
        mapping_path: &config.mapping_path.to_string_lossy(),
        input_path: &config.input_path.to_string_lossy(),
        snapshot_label: config.snapshot_label,
        snapshot_date: config.snapshot_date,
        reliability_rank: config.reliability_rank,
        batch_size: config.batch_size,
        workers: config.workers,
    })?;
    let shard_ingest_secs = shard_ingest_started_at.elapsed().as_secs_f64();

    let snapshot_id = session.snapshot_id;
    let merge_sql_started_at = Instant::now();
    let merge_phase_stats: MergePhaseStats =
        merge::merge_ingest_session(config.db_path, session)
            .map_err(|err| merge::fail_snapshot(config.db_path, snapshot_id, err))?;
    let merge_sql_secs = merge_sql_started_at.elapsed().as_secs_f64();

    let validate_started_at = Instant::now();
    validate_snapshot(config.db_path, config.snapshot_label)?;

    let mut conn = open_rw(config.db_path)?;
    let tx = conn.transaction()?;
    set_snapshot_status(&tx, snapshot_id, "validated")?;
    tx.commit()?;
    let validate_secs = validate_started_at.elapsed().as_secs_f64();

    let total_secs = ingest_started_at.elapsed().as_secs_f64();
    log_ingest_timing(
        config,
        &merge_phase_stats,
        total_secs,
        shard_ingest_secs,
        merge_sql_secs,
        validate_secs,
    );

    Ok(IngestPhaseStats {
        shard_ingest_secs,
        merge_sql_secs,
        merge_prepare_secs: merge_phase_stats.prepare_secs,
        merge_core_secs: merge_phase_stats.core_secs,
        merge_phone_secs: merge_phase_stats.phone_secs,
        merge_email_secs: merge_phase_stats.email_secs,
        merge_cleanup_secs: merge_phase_stats.cleanup_secs,
        merge_attach_detach_secs: merge_phase_stats.attach_detach_secs,
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
        "document",
        "company",
        "company_role",
        "company_phone",
        "doc_projection",
        "doc_projection_phone_index",
        "company_projection",
        "company_projection_phone_index",
    ] {
        let sql = format!("SELECT EXISTS(SELECT 1 FROM {table} LIMIT 1)");
        let has_rows: i64 = conn.query_row(&sql, [], |row| row.get(0))?;
        println!("{table}_has_rows={has_rows}");
    }
    let max_doc_id: i64 = conn.query_row(
        "SELECT COALESCE(MAX(doc_id), 0) FROM doc_projection",
        [],
        |row| row.get(0),
    )?;
    println!("doc_projection_max_doc_id={max_doc_id}");
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

fn log_ingest_timing(
    config: &IngestPhaseConfig<'_>,
    stats: &MergePhaseStats,
    total_secs: f64,
    shard_ingest_secs: f64,
    merge_sql_secs: f64,
    validate_secs: f64,
) {
    let snapshot_label = config.snapshot_label;
    if let Some(source_key) = config.source_key {
        println!(
            "[pipeline] ingest_timing source_key={source_key} snapshot_label={snapshot_label} total_secs={total_secs:.3} shard_ingest_secs={shard_ingest_secs:.3} merge_sql_secs={merge_sql_secs:.3} merge_prepare_secs={:.3} merge_core_secs={:.3} merge_phone_secs={:.3} merge_email_secs={:.3} merge_cleanup_secs={:.3} merge_attach_detach_secs={:.3} validate_secs={validate_secs:.3}",
            stats.prepare_secs,
            stats.core_secs,
            stats.phone_secs,
            stats.email_secs,
            stats.cleanup_secs,
            stats.attach_detach_secs,
        );
    } else {
        println!(
            "[pipeline] ingest_timing snapshot_label={snapshot_label} total_secs={total_secs:.3} shard_ingest_secs={shard_ingest_secs:.3} merge_sql_secs={merge_sql_secs:.3} merge_prepare_secs={:.3} merge_core_secs={:.3} merge_phone_secs={:.3} merge_email_secs={:.3} merge_cleanup_secs={:.3} merge_attach_detach_secs={:.3} validate_secs={validate_secs:.3}",
            stats.prepare_secs,
            stats.core_secs,
            stats.phone_secs,
            stats.email_secs,
            stats.cleanup_secs,
            stats.attach_detach_secs,
        );
    }
}
