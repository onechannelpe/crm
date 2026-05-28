//! Benchmark report contracts and measurement helpers.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

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

pub fn percentile(sorted_values: &[f64], p: f64) -> f64 {
    if sorted_values.is_empty() {
        return 0.0;
    }
    let rank = ((sorted_values.len() - 1) as f64 * p).round() as usize;
    sorted_values[rank.min(sorted_values.len() - 1)]
}
