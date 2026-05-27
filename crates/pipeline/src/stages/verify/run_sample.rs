use crate::PipelineError;
use crate::canonical::schema::init_schema;
use crate::stages::bootstrap::{PhaseTiming, RunContext, SourceCheckpoint};
use crate::stages::extract::sample_with_header;
use crate::stages::verify::helpers::{
    IngestPhaseConfig, load_enabled_sources, mark_snapshots_materialized,
    materialize_and_quick_check, push_ingest_timings, run_ingest_phase,
};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::thread;
use std::time::Instant;

#[allow(clippy::too_many_arguments)]
pub fn run_matrix(
    db_path: &str,
    build_dir: &str,
    manifest_path: &str,
    workers: usize,
    row_cap: usize,
    run_osiptel_sample: bool,
    batch_size: usize,
    source_row_caps: &HashMap<String, usize>,
) -> Result<(), PipelineError> {
    let run_started_at = Instant::now();
    let mut timings = Vec::new();
    let mut checkpoints = Vec::new();

    let run_ctx = RunContext::new(db_path)?;
    run_ctx.write_metadata(db_path, manifest_path, "sample", workers, batch_size)?;

    let build_dir_path = Path::new(build_dir);
    fs::create_dir_all(build_dir_path)?;
    if Path::new(db_path).exists() {
        fs::remove_file(db_path)?;
    }

    println!("[pipeline] init schema");
    init_schema(db_path)?;

    let mut sources = Vec::new();
    for source in load_enabled_sources(manifest_path)? {
        if source.source_key == "osiptel" && !run_osiptel_sample {
            continue;
        }
        let sample_cap = source_row_caps
            .get(&source.source_key)
            .copied()
            .unwrap_or(row_cap);
        let sample_file = build_dir_path.join(format!("{}.sample.csv", source.source_key));
        sources.push((source, sample_cap, sample_file));
    }

    let mut extract_durations = HashMap::new();
    thread::scope(|scope| -> Result<(), PipelineError> {
        let mut handles = Vec::with_capacity(sources.len());
        for (source, sample_cap, sample_file) in &sources {
            println!(
                "[pipeline] prepare sample for {} from {}",
                source.source_key, source.raw_path
            );
            let source_key = source.source_key.clone();
            let src = PathBuf::from(&source.raw_path);
            let out = sample_file.clone();
            let cap = *sample_cap;
            handles.push(scope.spawn(move || -> Result<(String, f64), String> {
                let extract_started = Instant::now();
                sample_with_header(src, out, cap).map_err(|err| err.to_string())?;
                Ok((source_key, extract_started.elapsed().as_secs_f64()))
            }));
        }

        for handle in handles {
            let outcome = handle
                .join()
                .map_err(|_| PipelineError::Args("extract worker panicked".to_owned()))?;
            let (source_key, seconds) = outcome.map_err(PipelineError::Args)?;
            extract_durations.insert(source_key, seconds);
        }
        Ok(())
    })?;

    for (source, _sample_cap, sample_file) in sources {
        timings.push(PhaseTiming {
            phase: "extract".to_owned(),
            key: source.source_key.clone(),
            seconds: extract_durations
                .get(&source.source_key)
                .copied()
                .unwrap_or(0.0),
        });

        let snapshot_label = format!("{}-sample", source.source_key);
        let ingest_stats = run_ingest_phase(&IngestPhaseConfig {
            db_path,
            run_id: &run_ctx.run_id,
            mapping_path: Path::new(&source.mapping_path),
            input_path: &sample_file,
            snapshot_label: &snapshot_label,
            snapshot_date: &source.snapshot_date,
            reliability_rank: source.reliability_rank,
            batch_size,
            workers,
            source_key: Some(&source.source_key),
        })?;
        push_ingest_timings(&mut timings, &source.source_key, &ingest_stats);
        checkpoints.push(SourceCheckpoint {
            source_key: source.source_key.clone(),
            snapshot_label,
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
        "[pipeline] run_timing mode=sample materialize_secs={materialize_secs:.3} total_secs={total_secs:.3}",
    );
    Ok(())
}
