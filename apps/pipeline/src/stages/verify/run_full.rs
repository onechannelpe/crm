use crate::PipelineError;
use crate::config::runtime::{EvidenceMode, IngestMode};
use crate::db::schema::init_schema;
use crate::stages::bootstrap::{PhaseTiming, RunContext, SourceCheckpoint};
use crate::stages::verify::helpers::{load_enabled_sources, materialize_and_quick_check, run_ingest_phase};
use std::fs;
use std::path::Path;
use std::time::Instant;

#[allow(clippy::too_many_arguments)]
pub fn run_full(
    db_path: &str,
    manifest_path: &str,
    ingest_mode: IngestMode,
    evidence_mode: EvidenceMode,
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
        evidence_mode,
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
            Path::new(&source.mapping_path),
            Path::new(&source.raw_path),
            &source.snapshot_label,
            &source.snapshot_date,
            batch_size,
            workers,
            ingest_mode,
            evidence_mode,
            Some(&source.source_key),
        )?;
        timings.push(PhaseTiming {
            phase: "shard_ingest".to_owned(),
            key: source.source_key.clone(),
            seconds: ingest_stats.duration_secs,
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
