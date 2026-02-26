use crate::PipelineError;
use serde::Deserialize;
use std::collections::HashMap;
use std::fs;

#[derive(Debug, Deserialize)]
pub struct PipelineRuntimeConfig {
    pub paths: RuntimePaths,
    pub profiles: HashMap<String, RuntimeProfile>,
}

#[derive(Debug, Deserialize)]
pub struct RuntimePaths {
    pub manifest: String,
    pub normalized_dir: String,
    pub staged_db: String,
    pub bench_dir: String,
    pub engine_db: String,
}

#[derive(Debug, Deserialize)]
pub struct RuntimeProfile {
    pub mode: String,
    #[serde(default)]
    pub ingest_mode: Option<String>,
    #[serde(default)]
    pub row_cap: Option<usize>,
    #[serde(default)]
    pub batch_size: Option<usize>,
    #[serde(default)]
    pub include_osiptel: bool,
    #[serde(default)]
    pub source_row_caps: HashMap<String, usize>,
}

#[derive(Debug)]
pub struct ResolvedProfile {
    pub mode: ProfileMode,
    pub ingest_mode: IngestMode,
    pub row_cap: usize,
    pub batch_size: usize,
    pub include_osiptel: bool,
    pub source_row_caps: HashMap<String, usize>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProfileMode {
    Sample,
    Full,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IngestMode {
    Single,
    Sharded,
}

impl PipelineRuntimeConfig {
    pub fn from_path(path: &str) -> Result<Self, PipelineError> {
        let raw = fs::read_to_string(path)?;
        let config = toml::from_str::<Self>(&raw)
            .map_err(|err| PipelineError::Args(format!("invalid pipeline config: {err}")))?;
        Ok(config)
    }

    pub fn resolve_profile(&self, profile_name: &str) -> Result<ResolvedProfile, PipelineError> {
        let Some(profile) = self.profiles.get(profile_name) else {
            return Err(PipelineError::Args(format!(
                "profile not found in pipeline config: {profile_name}"
            )));
        };

        let mode = match profile.mode.as_str() {
            "sample" => ProfileMode::Sample,
            "full" => ProfileMode::Full,
            other => {
                return Err(PipelineError::Args(format!(
                    "unsupported profile mode '{other}' for profile '{profile_name}'"
                )));
            }
        };

        Ok(ResolvedProfile {
            mode,
            ingest_mode: resolve_ingest_mode(profile.ingest_mode.as_deref(), profile_name)?,
            row_cap: profile.row_cap.unwrap_or(10_000),
            batch_size: profile.batch_size.unwrap_or(50_000),
            include_osiptel: profile.include_osiptel,
            source_row_caps: profile.source_row_caps.clone(),
        })
    }
}

fn resolve_ingest_mode(
    ingest_mode: Option<&str>,
    profile_name: &str,
) -> Result<IngestMode, PipelineError> {
    match ingest_mode.unwrap_or("single") {
        "single" => Ok(IngestMode::Single),
        "sharded" => Ok(IngestMode::Sharded),
        other => Err(PipelineError::Args(format!(
            "unsupported ingest mode '{other}' for profile '{profile_name}'"
        ))),
    }
}
