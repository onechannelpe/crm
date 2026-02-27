use crate::PipelineError;
use crate::config::runtime::IngestMode;
use crate::db::schema::init_schema;
use crate::stages::bootstrap::{PhaseTiming, RunContext, SourceCheckpoint};
use crate::stages::verify::helpers::{
    load_enabled_sources, mark_snapshots_materialized, materialize_and_quick_check,
    run_ingest_phase,
};
use std::fs;
use std::path::Path;
use std::time::Instant;

#[allow(clippy::too_many_arguments)]
pub fn run_full(
    db_path: &str,
    manifest_path: &str,
    ingest_mode: IngestMode,
    workers: usize,
    include_osiptel: bool,
    batch_size: usize,
) -> Result<(), PipelineError> {
    let run_started_at = Instant::now();
    let mut timings = Vec::new();
    let mut checkpoints = Vec::new();

    let run_ctx = RunContext::new(db_path)?;
    run_ctx.write_metadata(
        db_path,
        manifest_path,
        "full",
        ingest_mode,
        workers,
        batch_size,
    )?;

    if Path::new(db_path).exists() {
        fs::remove_file(db_path)?;
    }

    println!("[pipeline] init schema");
    init_schema(db_path)?;

    for source in load_enabled_sources(manifest_path)? {
        if source.source_key == "osiptel" && !include_osiptel {
            continue;
        }

        let ingest_stats = run_ingest_phase(
            db_path,
            &run_ctx.run_id,
            Path::new(&source.mapping_path),
            Path::new(&source.raw_path),
            &source.snapshot_label,
            &source.snapshot_date,
            source.reliability_rank,
            batch_size,
            workers,
            ingest_mode,
            Some(&source.source_key),
        )?;
        timings.push(PhaseTiming {
            phase: "shard_ingest".to_owned(),
            key: source.source_key.clone(),
            seconds: ingest_stats.shard_ingest_secs,
        });
        timings.push(PhaseTiming {
            phase: "merge_sql".to_owned(),
            key: source.source_key.clone(),
            seconds: ingest_stats.merge_sql_secs,
        });
        timings.push(PhaseTiming {
            phase: "merge_prepare".to_owned(),
            key: source.source_key.clone(),
            seconds: ingest_stats.merge_prepare_secs,
        });
        timings.push(PhaseTiming {
            phase: "merge_core".to_owned(),
            key: source.source_key.clone(),
            seconds: ingest_stats.merge_core_secs,
        });
        timings.push(PhaseTiming {
            phase: "merge_phone".to_owned(),
            key: source.source_key.clone(),
            seconds: ingest_stats.merge_phone_secs,
        });
        timings.push(PhaseTiming {
            phase: "merge_evidence".to_owned(),
            key: source.source_key.clone(),
            seconds: ingest_stats.merge_evidence_secs,
        });
        timings.push(PhaseTiming {
            phase: "merge_cleanup".to_owned(),
            key: source.source_key.clone(),
            seconds: ingest_stats.merge_cleanup_secs,
        });
        timings.push(PhaseTiming {
            phase: "merge_attach_detach".to_owned(),
            key: source.source_key.clone(),
            seconds: ingest_stats.merge_attach_detach_secs,
        });
        timings.push(PhaseTiming {
            phase: "validate".to_owned(),
            key: source.source_key.clone(),
            seconds: ingest_stats.validate_secs,
        });
        timings.push(PhaseTiming {
            phase: "ingest_total".to_owned(),
            key: source.source_key.clone(),
            seconds: ingest_stats.total_secs,
        });
        checkpoints.push(SourceCheckpoint {
            source_key: source.source_key,
            snapshot_label: source.snapshot_label,
            status: "completed".to_owned(),
        });
        run_ctx.write_checkpoints(&checkpoints)?;
    }

    let materialize_started_at = Instant::now();
    materialize_and_quick_check(db_path)?;
    mark_snapshots_materialized(db_path)?;
    let materialize_secs = materialize_started_at.elapsed().as_secs_f64();
    timings.push(PhaseTiming {
        phase: "materialize".to_owned(),
        key: "serving".to_owned(),
        seconds: materialize_secs,
    });

    let total_secs = run_started_at.elapsed().as_secs_f64();
    timings.push(PhaseTiming {
        phase: "total".to_owned(),
        key: "pipeline".to_owned(),
        seconds: total_secs,
    });
    run_ctx.write_timings(&timings)?;

    println!(
        "[pipeline] run_timing mode=full materialize_secs={materialize_secs:.3} total_secs={total_secs:.3}",
    );
    Ok(())
}
