use crate::PipelineError;
use crate::cli::Command;
use crate::config::manifest::verify_manifest;
use crate::config::runtime::{PipelineRuntimeConfig, ProfileMode};
use crate::contract_guard::validate_contracts;
use crate::db::schema::open_rw;
use crate::stages::gate;
use crate::stages::normalize;
use crate::stages::promote;
use crate::stages::verify;
use rusqlite::params;
use std::path::Path;
use std::time::SystemTime;

pub fn run(command: Command) -> Result<(), PipelineError> {
    match command {
        Command::VerifyManifest { manifest } => {
            verify_manifest(&manifest)?;
            validate_contracts(&manifest)?;
            Ok(())
        }
        Command::Validate { config, profile } => {
            let runtime = PipelineRuntimeConfig::from_path(&config)?;
            validate_contracts(&runtime.paths.manifest)?;
            let resolved = runtime.resolve_profile(&profile)?;
            normalize::normalize_matrix(
                &runtime.paths.manifest,
                resolved.row_cap,
                &runtime.paths.normalized_dir,
            )
        }
        Command::Bench { config, profile } => {
            let runtime = PipelineRuntimeConfig::from_path(&config)?;
            validate_contracts(&runtime.paths.manifest)?;
            let resolved = runtime.resolve_profile(&profile)?;
            let bench_db =
                Path::new(&runtime.paths.bench_dir).join(format!("bench-{}.sqlite", profile));
            let bench_build_dir =
                Path::new(&runtime.paths.bench_dir).join(format!("bench-{}", profile));

            verify::run_matrix(
                &bench_db.to_string_lossy(),
                &bench_build_dir.to_string_lossy(),
                &runtime.paths.manifest,
                resolved.workers,
                resolved.row_cap,
                resolved.include_osiptel,
                resolved.batch_size,
                &resolved.source_row_caps,
            )
        }
        Command::BenchMap { config, profile } => {
            let runtime = PipelineRuntimeConfig::from_path(&config)?;
            validate_contracts(&runtime.paths.manifest)?;
            let resolved = runtime.resolve_profile(&profile)?;
            let bench_build_dir =
                Path::new(&runtime.paths.bench_dir).join(format!("bench-map-{}", profile));

            verify::run_matrix_map_only(
                &bench_build_dir.to_string_lossy(),
                &runtime.paths.manifest,
                resolved.row_cap,
                resolved.include_osiptel,
                &resolved.source_row_caps,
            )
        }
        Command::Build { config, profile } => {
            let runtime = PipelineRuntimeConfig::from_path(&config)?;
            validate_contracts(&runtime.paths.manifest)?;
            let resolved = runtime.resolve_profile(&profile)?;

            if resolved.mode != ProfileMode::Full {
                return Err(PipelineError::Args(format!(
                    "build requires a full-mode profile, got '{profile}'"
                )));
            }

            verify::run_full(
                &runtime.paths.staged_db,
                &runtime.paths.manifest,
                resolved.workers,
                resolved.include_osiptel,
                resolved.batch_size,
            )
        }
        Command::Promote { config, from, to } => {
            let runtime = PipelineRuntimeConfig::from_path(&config)?;
            let from = from.unwrap_or(runtime.paths.staged_db);
            let to = to.unwrap_or(runtime.paths.engine_db);
            publish_with_gate_and_metadata(&from, &to)
        }
        Command::Refresh { config, slice, to } => {
            let runtime = PipelineRuntimeConfig::from_path(&config)?;
            validate_contracts(&runtime.paths.manifest)?;
            let profile = profile_for_slice(&slice)?;
            let resolved = runtime.resolve_profile(profile)?;

            if resolved.mode != ProfileMode::Sample {
                return Err(PipelineError::Args(format!(
                    "refresh requires a sample-mode profile, got '{profile}'"
                )));
            }

            let refresh_db =
                Path::new(&runtime.paths.bench_dir).join(format!("refresh-{}.sqlite", profile));
            let refresh_build_dir =
                Path::new(&runtime.paths.bench_dir).join(format!("refresh-{}", profile));

            verify::run_matrix(
                &refresh_db.to_string_lossy(),
                &refresh_build_dir.to_string_lossy(),
                &runtime.paths.manifest,
                resolved.workers,
                resolved.row_cap,
                resolved.include_osiptel,
                resolved.batch_size,
                &resolved.source_row_caps,
            )?;

            let to = to.unwrap_or(runtime.paths.engine_db);
            publish_with_gate_and_metadata(&refresh_db.to_string_lossy(), &to)
        }
    }
}

fn profile_for_slice(slice: &str) -> Result<&'static str, PipelineError> {
    match slice {
        "10k" => Ok("quick"),
        "100k" => Ok("standard"),
        "100k-osiptel" => Ok("heavy"),
        _ => Err(PipelineError::Args(format!(
            "unsupported slice '{slice}' (supported: 10k, 100k, 100k-osiptel)"
        ))),
    }
}

fn publish_with_gate_and_metadata(from: &str, to: &str) -> Result<(), PipelineError> {
    if !Path::new(from).exists() {
        return Err(PipelineError::Args(format!(
            "source db does not exist: {from}"
        )));
    }

    let gate_result = gate::run_gate(from)?;
    let gate_passed = gate_result.passed;
    println!(
        "[pipeline] gate passed={} checks={}",
        gate_passed,
        gate_result.checks.len()
    );
    for check in &gate_result.checks {
        if !check.passed {
            eprintln!(
                "[pipeline] gate FAIL check={} actual={:.4} threshold={:.4} {}",
                check.name, check.actual, check.threshold, check.message
            );
        }
    }
    // Stamp promoted-build metadata into the staging database before VACUUM INTO.
    {
        let conn = open_rw(from)?;
        let now_duration = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map_err(|error| {
                PipelineError::Args(format!("system time error during promote: {error}"))
            })?;
        let now_millis = now_duration.as_millis() as i64;
        let now_nanos = now_duration.as_nanos();
        let build_id = format!("build-{now_nanos}");
        let rows: i64 = conn.query_row("SELECT COUNT(*) FROM doc_projection", params![], |r| {
            r.get(0)
        })?;
        println!(
            "[pipeline] build metadata: build_id={} gate_passed={} built_at={} rows={}",
            build_id, gate_passed, now_millis, rows
        );

        if !gate_passed {
            return Err(PipelineError::Args(format!(
                "quality gate failed for build_id={build_id} — inspect gate failures above"
            )));
        }

        conn.execute(
            "INSERT OR REPLACE INTO _pipeline_build(key, value) VALUES (?1, ?2)",
            params!["build_id", build_id],
        )?;
        conn.execute(
            "INSERT OR REPLACE INTO _pipeline_build(key, value) VALUES (?1, ?2)",
            params!["built_at", now_millis.to_string()],
        )?;
        conn.execute(
            "INSERT OR REPLACE INTO _pipeline_build(key, value) VALUES (?1, ?2)",
            params!["rows", rows.to_string()],
        )?;
    }

    promote::promote_db(from, to)
}
