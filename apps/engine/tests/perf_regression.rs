use crm_engine::api::contracts::{SearchRequest, SearchType};
use crm_engine::domain::search_service::SearchService;
use crm_engine::storage::sqlite::connection;
use serde::Deserialize;
use serde_json::json;
use std::fs;
use std::time::Instant;

#[derive(Debug, Deserialize)]
struct Workload {
    dni: Vec<String>,
    ruc: Vec<String>,
    phone: Vec<String>,
    phone_enriched: Vec<String>,
    person_name: Vec<String>,
    company_name: Vec<String>,
}

#[test]
#[ignore]
fn perf_regression_probe() {
    let db_path = std::env::var("ENGINE_DB_PATH").expect("ENGINE_DB_PATH required");
    let workload_path = std::env::var("ENGINE_WORKLOAD_PATH")
        .unwrap_or_else(|_| "apps/engine/data/sqlite_workload.json".into());
    let iterations: usize = std::env::var("ENGINE_WORKLOAD_ITERATIONS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(5000);

    let raw = fs::read_to_string(&workload_path).expect("read workload json");
    let workload: Workload = serde_json::from_str(&raw).expect("parse workload json");

    let pool = connection::make_pool(&db_path).expect("pool");
    let service = SearchService::new(pool, 100);

    let metrics = json!({
        "dni": bench(&service, SearchType::Dni, &workload.dni, iterations),
        "ruc": bench(&service, SearchType::Ruc, &workload.ruc, iterations),
        "phone": bench(&service, SearchType::Phone, &workload.phone, iterations),
        "phone_enriched": bench(&service, SearchType::PhoneEnriched, &workload.phone_enriched, iterations),
        "person_name": bench(&service, SearchType::PersonName, &workload.person_name, iterations),
        "company_name": bench(&service, SearchType::CompanyName, &workload.company_name, iterations)
    });

    let payload = json!({
        "iterations": iterations,
        "metrics": metrics
    });
    println!("PERF_METRICS_JSON {}", payload);

    if let Ok(path) = std::env::var("ENGINE_PERF_BASELINE_JSON") {
        let baseline_raw = fs::read_to_string(path).expect("read baseline");
        let baseline: serde_json::Value =
            serde_json::from_str(&baseline_raw).expect("parse baseline");
        let allowed: f64 = std::env::var("ENGINE_PERF_REGRESSION_FACTOR")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(1.20);

        for key in [
            "dni",
            "ruc",
            "phone",
            "phone_enriched",
            "person_name",
            "company_name",
        ] {
            let cur = payload["metrics"][key]["p95_ms"].as_f64().expect("cur p95");
            let base = baseline["metrics"][key]["p95_ms"]
                .as_f64()
                .expect("base p95");
            assert!(
                cur <= base * allowed,
                "p95 regression for {key}: current={cur} baseline={base} allowed_factor={allowed}"
            );
        }
    }
}

fn bench(
    service: &SearchService,
    kind: SearchType,
    values: &[String],
    iterations: usize,
) -> serde_json::Value {
    if values.is_empty() || iterations == 0 {
        return json!({"iterations": 0, "hits": 0, "p50_ms": 0.0, "p95_ms": 0.0, "avg_ms": 0.0, "qps": 0.0});
    }

    let mut times = Vec::with_capacity(iterations);
    let mut hits = 0usize;
    for i in 0..iterations {
        let req = SearchRequest {
            search_type: kind,
            value: values[i % values.len()].clone(),
            limit: 20,
        };
        let start = Instant::now();
        let response = service.search(&req).expect("search");
        times.push(start.elapsed().as_secs_f64() * 1000.0);
        hits += response.count;
    }

    times.sort_by(|a, b| a.partial_cmp(b).expect("finite"));
    let total: f64 = times.iter().sum();
    let p50 = percentile(&times, 0.50);
    let p95 = percentile(&times, 0.95);
    json!({
        "iterations": iterations,
        "hits": hits,
        "p50_ms": p50,
        "p95_ms": p95,
        "avg_ms": total / iterations as f64,
        "qps": iterations as f64 / (total / 1000.0)
    })
}

fn percentile(values: &[f64], p: f64) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    let idx = ((values.len() - 1) as f64 * p).round() as usize;
    values[idx.min(values.len() - 1)]
}
