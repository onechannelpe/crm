use crate::PipelineError;
use crate::config::mapping::SourceMapping;
use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, serde::Deserialize)]
pub struct SourceManifest {
    pub version: u32,
    pub sources: Vec<SourceManifestEntry>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct SourceManifestEntry {
    pub source_key: String,
    pub snapshot_label: String,
    pub snapshot_date: String,
    pub raw_path: String,
    pub mapping_path: String,
    pub reliability_rank: i64,
    pub priority: i64,
    pub enabled: bool,
}

#[derive(Debug, Serialize)]
struct ManifestCheckResult {
    source_key: String,
    enabled: bool,
    reliability_rank: i64,
    priority: i64,
    raw_exists: bool,
    mapping_exists: bool,
}

pub fn load_manifest(path: &str) -> Result<SourceManifest, PipelineError> {
    let raw = fs::read_to_string(path)?;
    let manifest = serde_json::from_str::<SourceManifest>(&raw)?;
    Ok(manifest)
}

pub fn verify_manifest(manifest_path: &str) -> Result<SourceManifest, PipelineError> {
    let manifest = load_manifest(manifest_path)?;
    if manifest.version != 1 {
        return Err(PipelineError::Args(format!(
            "unsupported manifest version: {}",
            manifest.version
        )));
    }

    let mut checks: Vec<ManifestCheckResult> = Vec::with_capacity(manifest.sources.len());
    for source in &manifest.sources {
        let raw_exists = Path::new(&source.raw_path).exists();
        let mapping_exists = Path::new(&source.mapping_path).exists();

        if source.enabled && (!raw_exists || !mapping_exists) {
            return Err(PipelineError::Args(format!(
                "manifest validation failed for {}: raw_exists={}, mapping_exists={}",
                source.source_key, raw_exists, mapping_exists
            )));
        }

        if mapping_exists {
            let mapping = SourceMapping::from_path(&source.mapping_path)?;
            if mapping.source_key != source.source_key {
                return Err(PipelineError::Args(format!(
                    "source_key mismatch: manifest={} mapping={}",
                    source.source_key, mapping.source_key
                )));
            }
        }

        checks.push(ManifestCheckResult {
            source_key: source.source_key.clone(),
            enabled: source.enabled,
            reliability_rank: source.reliability_rank,
            priority: source.priority,
            raw_exists,
            mapping_exists,
        });
    }

    println!("{}", serde_json::to_string(&checks)?);
    Ok(manifest)
}
