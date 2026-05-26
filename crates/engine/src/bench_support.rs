use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::Path;

pub const CONTRACT_VERSION: u32 = 1;
pub const DEFAULT_SMOKE_ITERATIONS: usize = 300;
pub const DEFAULT_FULL_ITERATIONS: usize = 3000;
pub const DEFAULT_SMOKE_THRESHOLD_FACTOR: f64 = 1.30;
pub const DEFAULT_FULL_THRESHOLD_FACTOR: f64 = 1.15;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum BenchmarkMode {
    Smoke,
    Full,
}

impl BenchmarkMode {
    pub fn parse(value: &str) -> Result<Self, String> {
        match value {
            "smoke" => Ok(Self::Smoke),
            "full" => Ok(Self::Full),
            _ => Err(format!(
                "invalid mode '{value}', expected one of: smoke, full"
            )),
        }
    }

    pub fn default_iterations(self) -> usize {
        match self {
            Self::Smoke => DEFAULT_SMOKE_ITERATIONS,
            Self::Full => DEFAULT_FULL_ITERATIONS,
        }
    }

    pub fn default_threshold_factor(self) -> f64 {
        match self {
            Self::Smoke => DEFAULT_SMOKE_THRESHOLD_FACTOR,
            Self::Full => DEFAULT_FULL_THRESHOLD_FACTOR,
        }
    }
}

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryMetrics {
    pub iterations: usize,
    pub hits: usize,
    pub p50_ms: f64,
    pub p95_ms: f64,
    pub p99_ms: f64,
    pub avg_ms: f64,
    pub qps: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkSummary {
    pub contract_version: u32,
    pub mode: BenchmarkMode,
    pub git_sha: String,
    pub dataset_id: String,
    pub dataset_version: String,
    pub db_path: String,
    pub workload_sha256: String,
    pub max_limit: usize,
    pub threshold_factor: f64,
    pub metrics: BTreeMap<String, QueryMetrics>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum BenchmarkVerdict {
    Pass,
    Fail,
    NoBaseline,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkDecision {
    pub verdict: BenchmarkVerdict,
    pub compared_against_baseline: bool,
    pub violations: Vec<String>,
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

pub fn percentile(sorted_values: &[f64], p: f64) -> f64 {
    if sorted_values.is_empty() {
        return 0.0;
    }
    let rank = ((sorted_values.len() - 1) as f64 * p).round() as usize;
    sorted_values[rank.min(sorted_values.len() - 1)]
}

pub fn compare_to_baseline(
    current: &BenchmarkSummary,
    baseline: Option<&BenchmarkSummary>,
    required_metrics: &[&str],
) -> BenchmarkDecision {
    let Some(baseline) = baseline else {
        return BenchmarkDecision {
            verdict: BenchmarkVerdict::NoBaseline,
            compared_against_baseline: false,
            violations: Vec::new(),
        };
    };

    let mut violations: Vec<String> = Vec::new();

    if current.contract_version != baseline.contract_version {
        violations.push(format!(
            "contract_version mismatch current={} baseline={}",
            current.contract_version, baseline.contract_version
        ));
    }
    if current.mode != baseline.mode {
        violations.push(format!(
            "mode mismatch current={:?} baseline={:?}",
            current.mode, baseline.mode
        ));
    }
    if current.dataset_id != baseline.dataset_id {
        violations.push(format!(
            "dataset_id mismatch current={} baseline={}",
            current.dataset_id, baseline.dataset_id
        ));
    }
    if current.max_limit != baseline.max_limit {
        violations.push(format!(
            "max_limit mismatch current={} baseline={}",
            current.max_limit, baseline.max_limit
        ));
    }
    if current.workload_sha256 != baseline.workload_sha256 {
        violations.push(format!(
            "workload hash mismatch current={} baseline={}",
            current.workload_sha256, baseline.workload_sha256
        ));
    }

    let required: BTreeSet<&str> = required_metrics.iter().copied().collect();
    for key in &required {
        let Some(cur) = current.metrics.get(*key) else {
            violations.push(format!("missing metric '{key}' in current report"));
            continue;
        };
        let Some(base) = baseline.metrics.get(*key) else {
            violations.push(format!("missing metric '{key}' in baseline report"));
            continue;
        };

        let allowed_p95 = base.p95_ms * current.threshold_factor;
        if cur.p95_ms > allowed_p95 {
            violations.push(format!(
                "p95 regression for '{key}': current={} baseline={} factor={}",
                cur.p95_ms, base.p95_ms, current.threshold_factor
            ));
        }

        if base.hits > 0 {
            let min_hits = ((base.hits as f64) * 0.90).floor() as usize;
            if cur.hits < min_hits {
                violations.push(format!(
                    "hit regression for '{key}': current={} baseline={} min_allowed={}",
                    cur.hits, base.hits, min_hits
                ));
            }
        }
    }

    let verdict = if violations.is_empty() {
        BenchmarkVerdict::Pass
    } else {
        BenchmarkVerdict::Fail
    };

    BenchmarkDecision {
        verdict,
        compared_against_baseline: true,
        violations,
    }
}
