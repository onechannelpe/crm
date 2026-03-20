use engine::bench_support::{BenchmarkDecision, BenchmarkSummary};
use std::fs;
use std::path::Path;

pub fn read_baseline(path: Option<&Path>) -> Result<Option<BenchmarkSummary>, String> {
    let Some(path) = path else {
        return Ok(None);
    };

    if !path.exists() {
        eprintln!(
            "baseline file does not exist, running without baseline: {}",
            path.display()
        );
        return Ok(None);
    }

    let raw = fs::read_to_string(path)
        .map_err(|e| format!("failed to read baseline json at {}: {e}", path.display()))?;
    let value: serde_json::Value =
        serde_json::from_str(&raw).map_err(|e| format!("failed to parse baseline json: {e}"))?;

    let summary = if value.get("summary").is_some() {
        serde_json::from_value::<BenchmarkSummary>(value["summary"].clone())
            .map_err(|e| format!("failed to parse baseline summary object: {e}"))?
    } else {
        serde_json::from_value::<BenchmarkSummary>(value)
            .map_err(|e| format!("failed to parse baseline summary json: {e}"))?
    };

    Ok(Some(summary))
}

pub fn write_output(
    output_path: &Path,
    summary: &BenchmarkSummary,
    decision: &BenchmarkDecision,
) -> Result<(), String> {
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("failed to create output dir {}: {e}", parent.display()))?;
    }

    let payload = serde_json::json!({
        "summary": summary,
        "decision": decision,
    });
    let pretty = serde_json::to_string_pretty(&payload)
        .map_err(|e| format!("json serialize failed: {e}"))?;
    fs::write(output_path, pretty)
        .map_err(|e| format!("failed to write report {}: {e}", output_path.display()))?;
    Ok(())
}

pub fn print_summary(summary: &BenchmarkSummary, decision: &BenchmarkDecision) {
    println!(
        "bench-search mode={:?} dataset={} version={} verdict={:?}",
        summary.mode, summary.dataset_id, summary.dataset_version, decision.verdict
    );

    for (name, m) in &summary.metrics {
        println!(
            "metric={} p50_ms={:.4} p95_ms={:.4} p99_ms={:.4} avg_ms={:.4} qps={:.2} hits={} iterations={}",
            name, m.p50_ms, m.p95_ms, m.p99_ms, m.avg_ms, m.qps, m.hits, m.iterations
        );
    }

    if !decision.violations.is_empty() {
        println!("violations:");
        for v in &decision.violations {
            println!("- {v}");
        }
    }
}
