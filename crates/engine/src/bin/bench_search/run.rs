use engine::bench_support::{BenchmarkMode, BenchmarkSummary, QueryMetrics, Workload, percentile};
use search::contracts::{SearchRequest, SearchType};
use search::service::SearchService;
use std::collections::BTreeMap;
use std::path::Path;
use std::time::Instant;

pub const REQUIRED_METRICS: [&str; 6] = [
    "dni",
    "ruc",
    "phone",
    "phone_enriched",
    "person_name",
    "company_name",
];

pub struct RunSummaryInput<'a> {
    pub db_path: &'a Path,
    pub mode: BenchmarkMode,
    pub git_sha: String,
    pub dataset_id: String,
    pub dataset_version: String,
    pub workload_sha256: String,
    pub threshold_factor: f64,
    pub iterations: usize,
    pub max_limit: usize,
    pub workload: &'a Workload,
}

pub fn run_summary(input: RunSummaryInput<'_>) -> Result<BenchmarkSummary, String> {
    let RunSummaryInput {
        db_path,
        mode,
        git_sha,
        dataset_id,
        dataset_version,
        workload_sha256,
        threshold_factor,
        iterations,
        max_limit,
        workload,
    } = input;

    let pool = shared::sqlite::make_readonly_pool(
        db_path
            .to_str()
            .ok_or_else(|| "db path contains invalid UTF-8".to_string())?,
    )
    .map_err(|e| format!("failed to open sqlite pool: {e}"))?;

    {
        let conn = pool
            .get()
            .map_err(|e| format!("pool get failed during schema validation: {e}"))?;
        search::validate_schema(&conn).map_err(|e| format!("schema validation failed: {e}"))?;
    }

    let service = SearchService::new(pool, max_limit);
    let mut metrics = BTreeMap::new();
    metrics.insert(
        "dni".to_string(),
        bench_query(
            &service,
            SearchType::Dni,
            &workload.dni,
            iterations,
            max_limit,
        )?,
    );
    metrics.insert(
        "ruc".to_string(),
        bench_query(
            &service,
            SearchType::Ruc,
            &workload.ruc,
            iterations,
            max_limit,
        )?,
    );
    metrics.insert(
        "phone".to_string(),
        bench_query(
            &service,
            SearchType::Phone,
            &workload.phone,
            iterations,
            max_limit,
        )?,
    );
    metrics.insert(
        "phone_enriched".to_string(),
        bench_query(
            &service,
            SearchType::PhoneEnriched,
            &workload.phone_enriched,
            iterations,
            max_limit,
        )?,
    );
    metrics.insert(
        "person_name".to_string(),
        bench_query(
            &service,
            SearchType::PersonName,
            &workload.person_name,
            iterations,
            max_limit,
        )?,
    );
    metrics.insert(
        "company_name".to_string(),
        bench_query(
            &service,
            SearchType::CompanyName,
            &workload.company_name,
            iterations,
            max_limit,
        )?,
    );

    Ok(BenchmarkSummary {
        contract_version: engine::bench_support::CONTRACT_VERSION,
        mode,
        git_sha,
        dataset_id,
        dataset_version,
        db_path: db_path.display().to_string(),
        workload_sha256,
        max_limit,
        threshold_factor,
        metrics,
    })
}

fn bench_query(
    service: &SearchService,
    search_type: SearchType,
    values: &[String],
    iterations: usize,
    max_limit: usize,
) -> Result<QueryMetrics, String> {
    if values.is_empty() {
        return Err(format!(
            "workload list is empty for search type '{search_type:?}'"
        ));
    }

    let mut times = Vec::with_capacity(iterations);
    let mut hits = 0usize;
    for idx in 0..iterations {
        let req = SearchRequest {
            search_type,
            value: values[idx % values.len()].clone(),
            limit: max_limit,
        };

        let start = Instant::now();
        let response = service
            .search(&req)
            .map_err(|e| format!("search failed for '{search_type:?}': {e}"))?;
        let elapsed_ms = start.elapsed().as_secs_f64() * 1000.0;
        times.push(elapsed_ms);
        hits += response.count;
    }

    times.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let total: f64 = times.iter().sum();
    let avg = total / iterations as f64;
    let qps = if total > 0.0 {
        iterations as f64 / (total / 1000.0)
    } else {
        0.0
    };

    Ok(QueryMetrics {
        iterations,
        hits,
        p50_ms: percentile(&times, 0.50),
        p95_ms: percentile(&times, 0.95),
        p99_ms: percentile(&times, 0.99),
        avg_ms: avg,
        qps,
    })
}
