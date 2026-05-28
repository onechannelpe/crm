use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Deserialize)]
pub struct Workload {
    pub dni: Vec<String>,
    pub ruc: Vec<String>,
    pub phone: Vec<String>,
    pub phone_enriched: Vec<String>,
    pub person_name: Vec<String>,
    pub company_name: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DatasetManifest {
    pub dataset_id: String,
    pub dataset_version: String,
    pub db_path: String,
    pub doc_projection_contract_sha256: String,
    pub company_projection_contract_sha256: String,
    pub projection_rows: Option<i64>,
    pub workload_sha256: Option<String>,
}

pub fn read_workload(path: &Path) -> Result<Workload, String> {
    let raw = fs::read_to_string(path)
        .map_err(|e| format!("failed to read workload at {}: {e}", path.display()))?;
    let workload: Workload = serde_json::from_str(&raw)
        .map_err(|e| format!("failed to parse workload json {}: {e}", path.display()))?;

    if workload.dni.is_empty()
        || workload.ruc.is_empty()
        || workload.phone.is_empty()
        || workload.phone_enriched.is_empty()
        || workload.person_name.is_empty()
        || workload.company_name.is_empty()
    {
        return Err("workload lists must all be non-empty".to_string());
    }

    Ok(workload)
}

pub fn read_manifest(path: Option<&Path>) -> Result<Option<DatasetManifest>, String> {
    let Some(path) = path else {
        return Ok(None);
    };

    let raw = fs::read_to_string(path)
        .map_err(|e| format!("failed to read manifest at {}: {e}", path.display()))?;
    let manifest: DatasetManifest = serde_json::from_str(&raw)
        .map_err(|e| format!("failed to parse manifest {}: {e}", path.display()))?;

    if manifest.dataset_id.trim().is_empty() {
        return Err("manifest dataset_id must be non-empty".to_string());
    }
    if manifest.dataset_version.trim().is_empty() {
        return Err("manifest dataset_version must be non-empty".to_string());
    }
    if manifest.doc_projection_contract_sha256.trim().is_empty() {
        return Err("manifest doc_projection_contract_sha256 must be non-empty".to_string());
    }
    if manifest
        .company_projection_contract_sha256
        .trim()
        .is_empty()
    {
        return Err("manifest company_projection_contract_sha256 must be non-empty".to_string());
    }

    Ok(Some(manifest))
}

pub fn sha256_file(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    Ok(hex::encode(hasher.finalize()))
}
