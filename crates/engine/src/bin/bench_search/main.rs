mod cli;
mod report;
mod run;

use engine::bench_support::{
    BenchmarkVerdict, compare_to_baseline, read_manifest, read_workload, sha256_file,
};
use std::path::PathBuf;

fn main() {
    if let Err(e) = run_main() {
        eprintln!("error: {e}");
        std::process::exit(1);
    }
}

fn run_main() -> Result<(), String> {
    if cli::wants_help() {
        println!("{}", cli::usage());
        return Ok(());
    }

    let cfg = cli::parse_args()?;
    let manifest = read_manifest(cfg.dataset_manifest_json.as_deref())?;

    let db_path = match (&cfg.db_path, manifest.as_ref()) {
        (Some(path), _) => path.clone(),
        (None, Some(m)) => PathBuf::from(&m.db_path),
        (None, None) => {
            return Err("either --db-path or --dataset-manifest-json is required".to_string());
        }
    };
    if !db_path.exists() {
        return Err(format!("db path does not exist: {}", db_path.display()));
    }

    let contract_sha = sha256_file(&cfg.projection_contract_path)?;
    if let Some(m) = &manifest {
        if m.contract_sha256 != contract_sha {
            return Err(format!(
                "contract hash mismatch expected={} actual={}",
                m.contract_sha256, contract_sha
            ));
        }
    }

    let workload = read_workload(&cfg.workload_json)?;
    let workload_sha = sha256_file(&cfg.workload_json)?;
    if let Some(m) = &manifest {
        if let Some(expected_workload_sha) = &m.workload_sha256 {
            if expected_workload_sha != &workload_sha {
                return Err(format!(
                    "workload hash mismatch expected={} actual={}",
                    expected_workload_sha, workload_sha
                ));
            }
        }
    }

    let dataset_id = manifest
        .as_ref()
        .map(|m| m.dataset_id.clone())
        .unwrap_or_else(|| cfg.dataset_id.clone());
    let dataset_version = manifest
        .as_ref()
        .map(|m| m.dataset_version.clone())
        .unwrap_or_else(|| cfg.dataset_version.clone());

    let summary = run::run_summary(
        &db_path,
        cfg.mode,
        cfg.git_sha,
        dataset_id,
        dataset_version,
        workload_sha,
        cfg.threshold_factor,
        cfg.iterations,
        cfg.max_limit,
        &workload,
    )?;

    if let Some(m) = &manifest {
        if let Some(rows) = m.projection_rows {
            if rows <= 0 {
                return Err("manifest projection_rows must be greater than zero".to_string());
            }
            for key in run::REQUIRED_METRICS {
                let hits = summary
                    .metrics
                    .get(key)
                    .map(|metric| metric.hits)
                    .unwrap_or_default();
                if hits == 0 {
                    return Err(format!(
                        "zero hits for required metric '{}' against projection_rows={rows}",
                        key
                    ));
                }
            }
        }
    }

    let baseline = report::read_baseline(cfg.baseline_json.as_deref())?;
    let decision = compare_to_baseline(&summary, baseline.as_ref(), &run::REQUIRED_METRICS);

    if cfg.strict_baseline && decision.verdict == BenchmarkVerdict::NoBaseline {
        return Err("strict baseline is enabled and no baseline was provided".to_string());
    }

    report::write_output(&cfg.output_json, &summary, &decision)?;
    report::print_summary(&summary, &decision);

    if decision.verdict == BenchmarkVerdict::Fail {
        return Err("benchmark failed regression checks".to_string());
    }

    Ok(())
}
