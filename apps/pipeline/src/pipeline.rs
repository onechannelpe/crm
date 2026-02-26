use crate::PipelineError;
use crate::cli::Command;
use crate::config::manifest::verify_manifest;
use crate::config::runtime::{PipelineRuntimeConfig, ProfileMode};
use crate::stages::materialize;
use crate::stages::normalize;
use crate::stages::verify;
use std::path::Path;

pub fn run(command: Command) -> Result<(), PipelineError> {
    match command {
        Command::VerifyManifest { manifest } => {
            verify_manifest(&manifest)?;
            Ok(())
        }
        Command::Validate { config, profile } => {
            let runtime = PipelineRuntimeConfig::from_path(&config)?;
            let resolved = runtime.resolve_profile(&profile)?;
            normalize::normalize_matrix(
                &runtime.paths.manifest,
                resolved.row_cap,
                &runtime.paths.normalized_dir,
            )
        }
        Command::Bench { config, profile } => {
            let runtime = PipelineRuntimeConfig::from_path(&config)?;
            let resolved = runtime.resolve_profile(&profile)?;
            let bench_db =
                Path::new(&runtime.paths.bench_dir).join(format!("bench-{}.sqlite", profile));
            let bench_build_dir =
                Path::new(&runtime.paths.bench_dir).join(format!("bench-{}", profile));

            verify::run_matrix(
                &bench_db.to_string_lossy(),
                &bench_build_dir.to_string_lossy(),
                &runtime.paths.manifest,
                resolved.row_cap,
                resolved.include_osiptel,
                resolved.batch_size,
                &resolved.source_row_caps,
            )
        }
        Command::Build { config, profile } => {
            let runtime = PipelineRuntimeConfig::from_path(&config)?;
            let resolved = runtime.resolve_profile(&profile)?;

            if resolved.mode != ProfileMode::Full {
                return Err(PipelineError::Args(format!(
                    "build requires a full-mode profile, got '{profile}'"
                )));
            }

            verify::run_full(
                &runtime.paths.staged_db,
                &runtime.paths.manifest,
                resolved.include_osiptel,
                resolved.batch_size,
            )
        }
        Command::Promote { config, from, to } => {
            let runtime = PipelineRuntimeConfig::from_path(&config)?;
            let from = from.unwrap_or(runtime.paths.staged_db);
            let to = to.unwrap_or(runtime.paths.engine_db);
            materialize::promote_db(&from, &to)
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::cli::{Command, parse_args};

    #[test]
    fn parses_bench_with_default_profile() {
        let args = vec!["bench".to_owned()];
        let command = parse_args(&args).expect("parse should succeed");
        assert!(matches!(command, Command::Bench { .. }));
    }
}
