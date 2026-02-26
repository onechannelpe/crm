use crate::PipelineError;
use crate::config::manifest::{SourceManifestEntry, verify_manifest};
use crate::db::schema::{init_schema, open_rw};
use crate::stages::consolidate::ingest_snapshot;
use crate::stages::materialize::materialize_serving;
use crate::stages::validate::validate_snapshot;
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::path::{Path, PathBuf};

pub fn run_matrix(
    db_path: &str,
    build_dir: &str,
    manifest_path: &str,
    row_cap: usize,
    run_osiptel_sample: bool,
    batch_size: usize,
    source_row_caps: &HashMap<String, usize>,
) -> Result<(), PipelineError> {
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

        run_ingest_phase(
            db_path,
            Path::new(&source.mapping_path),
            &sample_file,
            &format!("{}-sample", source.source_key),
            &source.snapshot_date,
            batch_size,
        )?;
    }

    materialize_and_quick_check(db_path)?;
    Ok(())
}

pub fn run_full(
    db_path: &str,
    manifest_path: &str,
    include_osiptel: bool,
    batch_size: usize,
) -> Result<(), PipelineError> {
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
        run_ingest_phase(
            db_path,
            Path::new(&source.mapping_path),
            Path::new(&source.raw_path),
            &source.snapshot_label,
            &source.snapshot_date,
            batch_size,
        )?;
    }

    materialize_and_quick_check(db_path)?;
    Ok(())
}

fn run_ingest_phase(
    db_path: &str,
    mapping_path: &Path,
    input_path: &Path,
    snapshot_label: &str,
    snapshot_date: &str,
    batch_size: usize,
) -> Result<(), PipelineError> {
    println!(
        "[pipeline] ingest {snapshot_label} from {}",
        input_path.display()
    );
    ingest_snapshot(
        db_path,
        &mapping_path.to_string_lossy(),
        &input_path.to_string_lossy(),
        snapshot_label,
        snapshot_date,
        batch_size,
    )?;
    validate_snapshot(db_path, snapshot_label)?;
    Ok(())
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
