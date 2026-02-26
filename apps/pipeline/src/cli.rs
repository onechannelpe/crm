use crate::PipelineError;
use crate::config::paths::{
    default_build_dir, default_normalized_dir, default_source_manifest, default_staged_db,
};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Command {
    InitSchema {
        db: String,
    },
    RegisterSnapshot {
        db: String,
        source_key: String,
        source_name: String,
        snapshot_label: String,
        snapshot_date: String,
        file_path: String,
        reliability_rank: i64,
    },
    IngestSnapshot {
        db: String,
        mapping: String,
        input: String,
        snapshot_label: String,
        snapshot_date: String,
        batch_size: usize,
    },
    MaterializeServing {
        db: String,
    },
    ValidateSnapshot {
        db: String,
        snapshot_label: String,
    },
    PromoteDb {
        from: String,
        to: String,
    },
    RunMatrix {
        db: String,
        build_dir: String,
        manifest: String,
        row_cap_a: usize,
        row_cap_b: usize,
        run_osiptel_sample: bool,
        osiptel_row_cap: usize,
        batch_size: usize,
    },
    VerifyManifest {
        manifest: String,
    },
    NormalizeSource {
        manifest: String,
        source_key: String,
        row_cap: usize,
        out_dir: String,
    },
    NormalizeMatrix {
        manifest: String,
        row_cap: usize,
        out_dir: String,
    },
}

pub fn parse_args(args: &[String]) -> Result<Command, PipelineError> {
    if args.is_empty() {
        return Err(PipelineError::Args("missing command".to_owned()));
    }

    let cmd = args[0].as_str();
    let flags = parse_flags(&args[1..])?;

    match cmd {
        "init-schema" => Ok(Command::InitSchema {
            db: required_flag(&flags, "--db")?.to_owned(),
        }),
        "register-snapshot" => {
            let reliability_rank = required_flag(&flags, "--reliability-rank")?
                .parse::<i64>()
                .map_err(|_| {
                    PipelineError::Args("expected integer for --reliability-rank".to_owned())
                })?;

            Ok(Command::RegisterSnapshot {
                db: required_flag(&flags, "--db")?.to_owned(),
                source_key: required_flag(&flags, "--source-key")?.to_owned(),
                source_name: required_flag(&flags, "--source-name")?.to_owned(),
                snapshot_label: required_flag(&flags, "--snapshot-label")?.to_owned(),
                snapshot_date: required_flag(&flags, "--snapshot-date")?.to_owned(),
                file_path: required_flag(&flags, "--file-path")?.to_owned(),
                reliability_rank,
            })
        }
        "ingest-snapshot" => {
            let batch_size = flags
                .get("--batch-size")
                .map(String::as_str)
                .unwrap_or("50000")
                .parse::<usize>()
                .map_err(|_| PipelineError::Args("expected integer for --batch-size".to_owned()))?;

            Ok(Command::IngestSnapshot {
                db: required_flag(&flags, "--db")?.to_owned(),
                mapping: required_flag(&flags, "--mapping")?.to_owned(),
                input: required_flag(&flags, "--input")?.to_owned(),
                snapshot_label: required_flag(&flags, "--snapshot-label")?.to_owned(),
                snapshot_date: required_flag(&flags, "--snapshot-date")?.to_owned(),
                batch_size,
            })
        }
        "materialize-serving" => Ok(Command::MaterializeServing {
            db: required_flag(&flags, "--db")?.to_owned(),
        }),
        "validate-snapshot" => Ok(Command::ValidateSnapshot {
            db: required_flag(&flags, "--db")?.to_owned(),
            snapshot_label: required_flag(&flags, "--snapshot-label")?.to_owned(),
        }),
        "promote-db" => Ok(Command::PromoteDb {
            from: required_flag(&flags, "--from")?.to_owned(),
            to: required_flag(&flags, "--to")?.to_owned(),
        }),
        "run-matrix" => {
            let batch_size = flags
                .get("--batch-size")
                .map(String::as_str)
                .unwrap_or("20000")
                .parse::<usize>()
                .map_err(|_| PipelineError::Args("expected integer for --batch-size".to_owned()))?;
            let row_cap_a = flags
                .get("--row-cap-a")
                .map(String::as_str)
                .unwrap_or("200000")
                .parse::<usize>()
                .map_err(|_| PipelineError::Args("expected integer for --row-cap-a".to_owned()))?;
            let row_cap_b = flags
                .get("--row-cap-b")
                .map(String::as_str)
                .unwrap_or("150000")
                .parse::<usize>()
                .map_err(|_| PipelineError::Args("expected integer for --row-cap-b".to_owned()))?;
            let osiptel_row_cap = flags
                .get("--osiptel-row-cap")
                .map(String::as_str)
                .unwrap_or("500000")
                .parse::<usize>()
                .map_err(|_| {
                    PipelineError::Args("expected integer for --osiptel-row-cap".to_owned())
                })?;

            let run_osiptel_sample = flags
                .get("--run-osiptel-sample")
                .map(String::as_str)
                .unwrap_or("0")
                == "1";

            Ok(Command::RunMatrix {
                db: flags
                    .get("--db")
                    .cloned()
                    .unwrap_or_else(|| default_staged_db().to_string_lossy().to_string()),
                build_dir: flags
                    .get("--build-dir")
                    .cloned()
                    .unwrap_or_else(|| default_build_dir().to_string_lossy().to_string()),
                manifest: flags
                    .get("--manifest")
                    .cloned()
                    .unwrap_or_else(|| default_source_manifest().to_string_lossy().to_string()),
                row_cap_a,
                row_cap_b,
                run_osiptel_sample,
                osiptel_row_cap,
                batch_size,
            })
        }
        "verify-manifest" => Ok(Command::VerifyManifest {
            manifest: flags
                .get("--manifest")
                .cloned()
                .unwrap_or_else(|| default_source_manifest().to_string_lossy().to_string()),
        }),
        "normalize-source" => {
            let row_cap = flags
                .get("--row-cap")
                .map(String::as_str)
                .unwrap_or("10000")
                .parse::<usize>()
                .map_err(|_| PipelineError::Args("expected integer for --row-cap".to_owned()))?;

            Ok(Command::NormalizeSource {
                manifest: flags
                    .get("--manifest")
                    .cloned()
                    .unwrap_or_else(|| default_source_manifest().to_string_lossy().to_string()),
                source_key: required_flag(&flags, "--source-key")?.to_owned(),
                row_cap,
                out_dir: flags
                    .get("--out-dir")
                    .cloned()
                    .unwrap_or_else(|| default_normalized_dir().to_string_lossy().to_string()),
            })
        }
        "normalize-matrix" => {
            let row_cap = flags
                .get("--row-cap")
                .map(String::as_str)
                .unwrap_or("10000")
                .parse::<usize>()
                .map_err(|_| PipelineError::Args("expected integer for --row-cap".to_owned()))?;
            Ok(Command::NormalizeMatrix {
                manifest: flags
                    .get("--manifest")
                    .cloned()
                    .unwrap_or_else(|| default_source_manifest().to_string_lossy().to_string()),
                row_cap,
                out_dir: flags
                    .get("--out-dir")
                    .cloned()
                    .unwrap_or_else(|| default_normalized_dir().to_string_lossy().to_string()),
            })
        }
        _ => Err(PipelineError::Args(format!("unknown command: {cmd}"))),
    }
}

fn parse_flags(args: &[String]) -> Result<HashMap<String, String>, PipelineError> {
    let mut out = HashMap::new();
    let mut i = 0usize;
    while i < args.len() {
        let key = args[i].clone();
        if !key.starts_with("--") {
            return Err(PipelineError::Args(format!(
                "expected flag starting with --, got: {key}"
            )));
        }
        let Some(value) = args.get(i + 1) else {
            return Err(PipelineError::Args(format!(
                "missing value for flag: {key}"
            )));
        };
        out.insert(key, value.clone());
        i += 2;
    }
    Ok(out)
}

fn required_flag<'a>(
    flags: &'a HashMap<String, String>,
    name: &str,
) -> Result<&'a str, PipelineError> {
    flags
        .get(name)
        .map(String::as_str)
        .ok_or_else(|| PipelineError::Args(format!("missing required flag: {name}")))
}
