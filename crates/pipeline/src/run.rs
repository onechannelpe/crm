use crate::PipelineError;
use crate::config::manifest::{SourceManifest, SourceManifestEntry, verify_manifest};
use crate::extract::sample_with_header;
use crate::ingest::{ShardIngestConfig, ingest_to_shards, map_snapshot_only};
use crate::materialize::materialize_serving;
use crate::merge::{MergePhaseStats, fail_snapshot, merge_ingest_session, set_snapshot_status};
use crate::schema::{init_schema, open_rw};
use crate::validate::validate_snapshot;
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::thread;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

// ---------------------------------------------------------------------------
// Run context types
// ---------------------------------------------------------------------------

#[derive(Serialize)]
pub struct RunMetadata {
    pub run_id: String,
    pub mode: String,
    pub ingest_mode: String,
    pub workers: usize,
    pub batch_size: usize,
    pub manifest_path: String,
    pub staged_db_path: String,
    pub git_commit: Option<String>,
    pub started_at_epoch_secs: u64,
}

#[derive(Serialize)]
pub struct PhaseTiming {
    pub phase: String,
    pub key: String,
    pub seconds: f64,
}

#[derive(Serialize)]
pub struct SourceCheckpoint {
    pub source_key: String,
    pub snapshot_label: String,
    pub status: String,
}

pub struct RunContext {
    pub run_id: String,
    pub metrics_path: PathBuf,
    pub checkpoint_path: PathBuf,
}

impl RunContext {
    pub fn new(db_path: &str) -> Result<Self, PipelineError> {
        let run_id = format!("run-{}-{}", now_epoch_secs(), std::process::id());
        let runs_root = Path::new(db_path)
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .join("runs")
            .join(&run_id);
        fs::create_dir_all(runs_root.join("logs"))?;
        fs::create_dir_all(runs_root.join("staging").join("shards"))?;
        fs::create_dir_all(runs_root.join("merge"))?;
        fs::create_dir_all(runs_root.join("metrics"))?;

        Ok(Self {
            run_id,
            metrics_path: runs_root.join("metrics").join("phase-timings.json"),
            checkpoint_path: runs_root.join("merge").join("checkpoints.json"),
        })
    }

    pub fn write_metadata(
        &self,
        db_path: &str,
        manifest_path: &str,
        mode: &str,
        workers: usize,
        batch_size: usize,
    ) -> Result<(), PipelineError> {
        let metadata = RunMetadata {
            run_id: self.run_id.clone(),
            mode: mode.to_owned(),
            ingest_mode: "sharded".to_owned(),
            workers,
            batch_size,
            manifest_path: manifest_path.to_owned(),
            staged_db_path: db_path.to_owned(),
            git_commit: git_commit_hash(),
            started_at_epoch_secs: now_epoch_secs(),
        };
        let metadata_path = self
            .metrics_path
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .join("metadata.json");
        write_json(&metadata_path, &metadata)
    }

    pub fn write_timings(&self, timings: &[PhaseTiming]) -> Result<(), PipelineError> {
        write_json(&self.metrics_path, timings)
    }

    pub fn write_checkpoints(&self, checkpoints: &[SourceCheckpoint]) -> Result<(), PipelineError> {
        write_json(&self.checkpoint_path, checkpoints)
    }
}

// ---------------------------------------------------------------------------
// Public pipeline entry points
// ---------------------------------------------------------------------------

pub fn run_full(
    db_path: &str,
    manifest_path: &str,
    workers: usize,
    include_osiptel: bool,
    batch_size: usize,
) -> Result<(), PipelineError> {
    let run_started_at = Instant::now();
    let mut timings = Vec::new();
    let mut checkpoints = Vec::new();

    let run_ctx = RunContext::new(db_path)?;
    run_ctx.write_metadata(db_path, manifest_path, "full", workers, batch_size)?;

    if Path::new(db_path).exists() {
        fs::remove_file(db_path)?;
    }

    println!("[pipeline] init schema");
    init_schema(db_path)?;

    for source in load_enabled_sources(manifest_path)? {
        if source.source_key == "osiptel" && !include_osiptel {
            continue;
        }

        let ingest_stats = run_ingest_phase(&IngestPhaseConfig {
            db_path,
            run_id: &run_ctx.run_id,
            mapping_path: Path::new(&source.mapping_path),
            input_path: Path::new(&source.raw_path),
            snapshot_label: &source.snapshot_label,
            snapshot_date: &source.snapshot_date,
            reliability_rank: source.reliability_rank,
            batch_size,
            workers,
            source_key: Some(&source.source_key),
        })?;
        push_ingest_timings(&mut timings, &source.source_key, &ingest_stats);
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

pub fn run_matrix_map_only(
    build_dir: &str,
    manifest_path: &str,
    row_cap: usize,
    run_osiptel_sample: bool,
    source_row_caps: &HashMap<String, usize>,
) -> Result<(), PipelineError> {
    let run_started_at = Instant::now();
    let mut map_total_secs = 0.0f64;
    let mut mapped_rows_total = 0usize;
    let build_dir_path = Path::new(build_dir);
    fs::create_dir_all(build_dir_path)?;

    for source in load_enabled_sources(manifest_path)? {
        if source.source_key == "osiptel" && !run_osiptel_sample {
            continue;
        }

        let sample_cap = source_row_caps
            .get(&source.source_key)
            .copied()
            .unwrap_or(row_cap);
        let sample_file = build_dir_path.join(format!("{}.sample.csv", source.source_key));

        println!(
            "[pipeline] prepare sample for {} from {}",
            source.source_key, source.raw_path
        );
        sample_with_header(source.raw_path.into(), sample_file.clone(), sample_cap)?;

        let map_started_at = Instant::now();
        let mapped_rows = map_snapshot_only(&source.mapping_path, &sample_file.to_string_lossy())?;
        let map_secs = map_started_at.elapsed().as_secs_f64();
        map_total_secs += map_secs;
        mapped_rows_total += mapped_rows;

        println!(
            "[pipeline] map_only_timing source_key={} rows={} seconds={map_secs:.3}",
            source.source_key, mapped_rows
        );
    }

    let total_secs = run_started_at.elapsed().as_secs_f64();
    let rows_per_sec = if map_total_secs > 0.0 {
        mapped_rows_total as f64 / map_total_secs
    } else {
        0.0
    };
    println!(
        "[pipeline] run_timing mode=map-only map_secs={map_total_secs:.3} total_secs={total_secs:.3} rows={} rows_per_sec={rows_per_sec:.0}",
        mapped_rows_total
    );
    Ok(())
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

struct IngestPhaseStats {
    shard_ingest_secs: f64,
    merge_sql_secs: f64,
    merge_prepare_secs: f64,
    merge_core_secs: f64,
    merge_phone_secs: f64,
    merge_email_secs: f64,
    merge_cleanup_secs: f64,
    merge_attach_detach_secs: f64,
    validate_secs: f64,
    total_secs: f64,
}

struct IngestPhaseConfig<'a> {
    db_path: &'a str,
    run_id: &'a str,
    mapping_path: &'a Path,
    input_path: &'a Path,
    snapshot_label: &'a str,
    snapshot_date: &'a str,
    reliability_rank: i64,
    batch_size: usize,
    workers: usize,
    source_key: Option<&'a str>,
}

fn load_enabled_sources(manifest_path: &str) -> Result<Vec<SourceManifestEntry>, PipelineError> {
    let SourceManifest { mut sources, .. } = verify_manifest(manifest_path)?;
    sources.retain(|source| source.enabled);
    sources.sort_by(|a, b| {
        b.priority
            .cmp(&a.priority)
            .then_with(|| a.source_key.cmp(&b.source_key))
    });
    Ok(sources)
}

fn push_ingest_timings(timings: &mut Vec<PhaseTiming>, source_key: &str, stats: &IngestPhaseStats) {
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

fn run_ingest_phase(config: &IngestPhaseConfig<'_>) -> Result<IngestPhaseStats, PipelineError> {
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
    let merge_phase_stats: MergePhaseStats = merge_ingest_session(config.db_path, session)
        .map_err(|err| fail_snapshot(config.db_path, snapshot_id, err))?;
    let merge_sql_secs = merge_sql_started_at.elapsed().as_secs_f64();

    let validate_started_at = Instant::now();
    validate_snapshot(config.db_path, config.snapshot_label)?;

    let mut conn = open_rw(config.db_path)?;
    let tx = conn.transaction()?;
    set_snapshot_status(&tx, snapshot_id, "validated")?;
    tx.commit()?;
    let validate_secs = validate_started_at.elapsed().as_secs_f64();

    let total_secs = ingest_started_at.elapsed().as_secs_f64();
    let snapshot_label = config.snapshot_label;
    if let Some(source_key) = config.source_key {
        println!(
            "[pipeline] ingest_timing source_key={source_key} snapshot_label={snapshot_label} total_secs={total_secs:.3} shard_ingest_secs={shard_ingest_secs:.3} merge_sql_secs={merge_sql_secs:.3} merge_prepare_secs={:.3} merge_core_secs={:.3} merge_phone_secs={:.3} merge_email_secs={:.3} merge_cleanup_secs={:.3} merge_attach_detach_secs={:.3} validate_secs={validate_secs:.3}",
            merge_phase_stats.prepare_secs,
            merge_phase_stats.core_secs,
            merge_phase_stats.phone_secs,
            merge_phase_stats.email_secs,
            merge_phase_stats.cleanup_secs,
            merge_phase_stats.attach_detach_secs,
        );
    } else {
        println!(
            "[pipeline] ingest_timing snapshot_label={snapshot_label} total_secs={total_secs:.3} shard_ingest_secs={shard_ingest_secs:.3} merge_sql_secs={merge_sql_secs:.3} merge_prepare_secs={:.3} merge_core_secs={:.3} merge_phone_secs={:.3} merge_email_secs={:.3} merge_cleanup_secs={:.3} merge_attach_detach_secs={:.3} validate_secs={validate_secs:.3}",
            merge_phase_stats.prepare_secs,
            merge_phase_stats.core_secs,
            merge_phase_stats.phone_secs,
            merge_phase_stats.email_secs,
            merge_phase_stats.cleanup_secs,
            merge_phase_stats.attach_detach_secs,
        );
    }

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

fn materialize_and_quick_check(db_path: &str) -> Result<(), PipelineError> {
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

fn mark_snapshots_materialized(db_path: &str) -> Result<(), PipelineError> {
    let conn = open_rw(db_path)?;
    conn.execute(
        "UPDATE source_snapshot SET status='materialized' WHERE status='validated'",
        [],
    )?;
    Ok(())
}

fn write_json<T: Serialize + ?Sized>(path: &Path, value: &T) -> Result<(), PipelineError> {
    let content = serde_json::to_vec_pretty(value).map_err(|err| {
        PipelineError::Args(format!(
            "failed to serialize json {}: {err}",
            path.display()
        ))
    })?;
    fs::write(path, content)?;
    Ok(())
}

fn now_epoch_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_secs())
        .unwrap_or(0)
}

fn git_commit_hash() -> Option<String> {
    let output = Command::new("git")
        .args(["rev-parse", "HEAD"])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let value = String::from_utf8(output.stdout).ok()?;
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(trimmed.to_owned())
}
