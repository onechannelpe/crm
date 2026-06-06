use super::contract::BenchmarkSummary;
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

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
