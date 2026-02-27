use crate::PipelineError;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

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

    #[allow(clippy::too_many_arguments)]
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

fn write_json<T: Serialize + ?Sized>(path: &Path, value: &T) -> Result<(), PipelineError> {
    let content = serde_json::to_vec_pretty(value).map_err(|err| {
        PipelineError::Args(format!("failed to serialize json {}: {err}", path.display()))
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
    let output = Command::new("git").args(["rev-parse", "HEAD"]).output().ok()?;
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
