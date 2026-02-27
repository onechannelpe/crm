use crate::PipelineError;
use crate::stages::extract::sample_with_header;
use crate::stages::shard_ingest::map_snapshot_only;
use crate::stages::verify::helpers::load_enabled_sources;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::time::Instant;

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
