use crate::PipelineError;
use crate::config::manifest::{SourceManifestEntry, verify_manifest};
use crate::config::runtime::IngestMode;
use crate::db::schema::{init_schema, open_rw};
use crate::stages::consolidate::{ingest_snapshot, ingest_snapshot_sharded};
use crate::stages::materialize::materialize_serving;
use crate::stages::validate::validate_snapshot;
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::path::{Path, PathBuf};
use std::time::Instant;

struct IngestPhaseStats {
    duration_secs: f64,
}

pub fn run_matrix(
    db_path: &str,
    build_dir: &str,
    manifest_path: &str,
    ingest_mode: IngestMode,
    row_cap: usize,
    run_osiptel_sample: bool,
    batch_size: usize,
    source_row_caps: &HashMap<String, usize>,
) -> Result<(), PipelineError> {
    let run_started_at = Instant::now();
    let mut ingest_total_secs = 0.0f64;
    let build_dir_path = Path::new(build_dir);
    fs::create_dir_all(build_dir_path)?;
    if Path::new(db_path).exists() {
        fs::remove_file(db_path)?;
    }

    println!("[pipeline] init schema");
    init_schema(db_path)?;

    let manifest = verify_manifest(manifest_path)?;
    let mut enabled_sources: Vec<&SourceManifestEntry> =
        manifest.sources.iter().filter(|s| s.enabled).collect();
    enabled_sources.sort_by(|a, b| {
        b.priority
            .cmp(&a.priority)
            .then_with(|| a.source_key.cmp(&b.source_key))
    });

    for source in enabled_sources {
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
        sample_with_header(
            PathBuf::from(&source.raw_path),
            sample_file.clone(),
            sample_cap,
        )?;

        let ingest_stats = run_ingest_phase(
            db_path,
            Path::new(&source.mapping_path),
            &sample_file,
            &format!("{}-sample", source.source_key),
            &source.snapshot_date,
            batch_size,
            ingest_mode,
            Some(&source.source_key),
        )?;
        ingest_total_secs += ingest_stats.duration_secs;
    }

    let materialize_started_at = Instant::now();
    materialize_and_quick_check(db_path)?;
    let materialize_secs = materialize_started_at.elapsed().as_secs_f64();
    let total_secs = run_started_at.elapsed().as_secs_f64();
    println!(
        "[pipeline] run_timing mode=sample ingest_secs={ingest_total_secs:.3} materialize_secs={materialize_secs:.3} total_secs={total_secs:.3}",
    );
    Ok(())
}

pub fn run_full(
    db_path: &str,
    manifest_path: &str,
    ingest_mode: IngestMode,
    include_osiptel: bool,
    batch_size: usize,
) -> Result<(), PipelineError> {
    let run_started_at = Instant::now();
    let mut ingest_total_secs = 0.0f64;
    if Path::new(db_path).exists() {
        fs::remove_file(db_path)?;
    }

    println!("[pipeline] init schema");
    init_schema(db_path)?;

    let manifest = verify_manifest(manifest_path)?;
    let mut enabled_sources: Vec<&SourceManifestEntry> =
        manifest.sources.iter().filter(|s| s.enabled).collect();
    enabled_sources.sort_by(|a, b| {
        b.priority
            .cmp(&a.priority)
            .then_with(|| a.source_key.cmp(&b.source_key))
    });

    for source in enabled_sources {
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
            ingest_mode,
            Some(&source.source_key),
        )?;
        ingest_total_secs += ingest_stats.duration_secs;
    }

    let materialize_started_at = Instant::now();
    materialize_and_quick_check(db_path)?;
    let materialize_secs = materialize_started_at.elapsed().as_secs_f64();
    let total_secs = run_started_at.elapsed().as_secs_f64();
    println!(
        "[pipeline] run_timing mode=full ingest_secs={ingest_total_secs:.3} materialize_secs={materialize_secs:.3} total_secs={total_secs:.3}",
    );
    Ok(())
}

fn run_ingest_phase(
    db_path: &str,
    mapping_path: &Path,
    input_path: &Path,
    snapshot_label: &str,
    snapshot_date: &str,
    batch_size: usize,
    ingest_mode: IngestMode,
    source_key: Option<&str>,
) -> Result<IngestPhaseStats, PipelineError> {
    let ingest_started_at = Instant::now();
    println!(
        "[pipeline] ingest {snapshot_label} from {}",
        input_path.display()
    );
    match ingest_mode {
        IngestMode::Single => ingest_snapshot(
            db_path,
            &mapping_path.to_string_lossy(),
            &input_path.to_string_lossy(),
            snapshot_label,
            snapshot_date,
            batch_size,
        )?,
        IngestMode::Sharded => ingest_snapshot_sharded(
            db_path,
            &mapping_path.to_string_lossy(),
            &input_path.to_string_lossy(),
            snapshot_label,
            snapshot_date,
            batch_size,
        )?,
    }
    validate_snapshot(db_path, snapshot_label)?;
    let duration_secs = ingest_started_at.elapsed().as_secs_f64();
    if let Some(source_key) = source_key {
        println!(
            "[pipeline] ingest_timing source_key={source_key} snapshot_label={snapshot_label} seconds={duration_secs:.3}",
        );
    } else {
        println!("[pipeline] ingest_timing snapshot_label={snapshot_label} seconds={duration_secs:.3}");
    }
    Ok(IngestPhaseStats { duration_secs })
}

fn sample_with_header(src: PathBuf, out: PathBuf, cap: usize) -> Result<(), PipelineError> {
    let in_file = File::open(&src)?;
    let mut reader = BufReader::new(in_file);
    let out_file = File::create(out)?;
    let mut writer = BufWriter::new(out_file);

    let mut buf = Vec::new();
    let mut line_no = 0usize;
    loop {
        buf.clear();
        let bytes = reader.read_until(b'\n', &mut buf)?;
        if bytes == 0 {
            break;
        }
        if line_no >= cap {
            break;
        }
        let normalized = String::from_utf8_lossy(&buf);
        writer.write_all(normalized.as_bytes())?;
        line_no += 1;
    }
    writer.flush()?;
    Ok(())
}

fn materialize_and_quick_check(db_path: &str) -> Result<(), PipelineError> {
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
