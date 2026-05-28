use engine::benchmark::BenchmarkMode;
use std::env;
use std::path::PathBuf;

#[derive(Debug)]
pub struct Config {
    pub mode: BenchmarkMode,
    pub db_path: Option<PathBuf>,
    pub dataset_manifest_json: Option<PathBuf>,
    pub workload_json: PathBuf,
    pub doc_projection_contract_path: PathBuf,
    pub company_projection_contract_path: PathBuf,
    pub baseline_json: Option<PathBuf>,
    pub output_json: PathBuf,
    pub iterations: usize,
    pub max_limit: usize,
    pub threshold_factor: f64,
    pub strict_baseline: bool,
    pub git_sha: String,
    pub dataset_id: String,
    pub dataset_version: String,
}

pub fn wants_help() -> bool {
    env::args()
        .skip(1)
        .any(|arg| arg == "--help" || arg == "-h")
}

pub fn parse_args() -> Result<Config, String> {
    let mut mode = BenchmarkMode::Smoke;
    let mut db_path: Option<PathBuf> = None;
    let mut dataset_manifest_json: Option<PathBuf> = None;
    let mut workload_json = PathBuf::from("crates/engine/bench/workloads/default.json");
    let mut doc_projection_contract_path = PathBuf::from("contracts/engine/doc-projection.json");
    let mut company_projection_contract_path =
        PathBuf::from("contracts/engine/company-projection.json");
    let mut baseline_json: Option<PathBuf> = None;
    let mut output_json = PathBuf::from("target/bench-search/report.json");
    let mut iterations: Option<usize> = None;
    let mut max_limit = 100usize;
    let mut threshold_factor: Option<f64> = None;
    let mut strict_baseline = false;
    let mut git_sha = env::var("GITHUB_SHA").unwrap_or_else(|_| "local".to_string());
    let mut dataset_id = "search-smoke".to_string();
    let mut dataset_version = "unset".to_string();

    let mut args = env::args().skip(1);
    while let Some(flag) = args.next() {
        match flag.as_str() {
            "--mode" => mode = BenchmarkMode::parse(&next_arg(&mut args, &flag)?)?,
            "--db-path" => db_path = Some(PathBuf::from(next_arg(&mut args, &flag)?)),
            "--dataset-manifest-json" => {
                dataset_manifest_json = Some(PathBuf::from(next_arg(&mut args, &flag)?))
            }
            "--workload-json" => workload_json = PathBuf::from(next_arg(&mut args, &flag)?),
            "--doc-projection-contract-path" => {
                doc_projection_contract_path = PathBuf::from(next_arg(&mut args, &flag)?)
            }
            "--company-projection-contract-path" => {
                company_projection_contract_path = PathBuf::from(next_arg(&mut args, &flag)?)
            }
            "--baseline-json" => baseline_json = Some(PathBuf::from(next_arg(&mut args, &flag)?)),
            "--output-json" => output_json = PathBuf::from(next_arg(&mut args, &flag)?),
            "--iterations" => iterations = Some(parse_usize(&next_arg(&mut args, &flag)?, &flag)?),
            "--max-limit" => max_limit = parse_usize(&next_arg(&mut args, &flag)?, &flag)?,
            "--threshold-factor" => {
                threshold_factor = Some(parse_f64(&next_arg(&mut args, &flag)?, &flag)?)
            }
            "--strict-baseline" => strict_baseline = true,
            "--git-sha" => git_sha = next_arg(&mut args, &flag)?,
            "--dataset-id" => dataset_id = next_arg(&mut args, &flag)?,
            "--dataset-version" => dataset_version = next_arg(&mut args, &flag)?,
            other => return Err(format!("unknown argument: {other}\n\n{}", usage())),
        }
    }

    if db_path.is_none() && dataset_manifest_json.is_none() {
        return Err(format!(
            "either --db-path or --dataset-manifest-json is required\n\n{}",
            usage()
        ));
    }
    if let Some(path) = &db_path
        && !path.exists()
    {
        return Err(format!("db path does not exist: {}", path.display()));
    }
    if let Some(path) = &dataset_manifest_json
        && !path.exists()
    {
        return Err(format!("manifest path does not exist: {}", path.display()));
    }
    if !workload_json.exists() {
        return Err(format!(
            "workload path does not exist: {}",
            workload_json.display()
        ));
    }
    if !doc_projection_contract_path.exists() {
        return Err(format!(
            "doc projection contract path does not exist: {}",
            doc_projection_contract_path.display()
        ));
    }
    if !company_projection_contract_path.exists() {
        return Err(format!(
            "company projection contract path does not exist: {}",
            company_projection_contract_path.display()
        ));
    }

    let iterations = iterations.unwrap_or(mode.default_iterations());
    if iterations == 0 {
        return Err("iterations must be greater than zero".to_string());
    }
    if max_limit == 0 {
        return Err("max-limit must be greater than zero".to_string());
    }
    let threshold_factor = threshold_factor.unwrap_or(mode.default_threshold_factor());
    if !(1.0..=10.0).contains(&threshold_factor) {
        return Err(format!(
            "threshold-factor must be between 1.0 and 10.0, got {threshold_factor}"
        ));
    }

    Ok(Config {
        mode,
        db_path,
        dataset_manifest_json,
        workload_json,
        doc_projection_contract_path,
        company_projection_contract_path,
        baseline_json,
        output_json,
        iterations,
        max_limit,
        threshold_factor,
        strict_baseline,
        git_sha,
        dataset_id,
        dataset_version,
    })
}

fn next_arg(args: &mut impl Iterator<Item = String>, flag: &str) -> Result<String, String> {
    args.next()
        .ok_or_else(|| format!("missing value for {flag}\n\n{}", usage()))
}

fn parse_usize(value: &str, flag: &str) -> Result<usize, String> {
    value
        .parse::<usize>()
        .map_err(|_| format!("invalid integer for {flag}: {value}"))
}

fn parse_f64(value: &str, flag: &str) -> Result<f64, String> {
    value
        .parse::<f64>()
        .map_err(|_| format!("invalid number for {flag}: {value}"))
}

pub fn usage() -> String {
    [
        "Usage:",
        "  cargo run -p engine --bin bench-search --release -- --dataset-manifest-json <path> [options]",
        "  cargo run -p engine --bin bench-search --release -- --db-path <path> [options]",
        "",
        "Options:",
        "  --mode <smoke|full>             Benchmark mode (default: smoke)",
        "  --db-path <path>                SQLite path to benchmark",
        "  --dataset-manifest-json <path>  Dataset manifest path",
        "  --workload-json <path>          Workload json path",
        "  --doc-projection-contract-path <path>      Doc projection contract path",
        "  --company-projection-contract-path <path>  Company projection contract path",
        "  --baseline-json <path>          Baseline report json path",
        "  --output-json <path>            Output report json path",
        "  --iterations <int>              Iterations per query type",
        "  --max-limit <int>               Search limit",
        "  --threshold-factor <float>      Allowed p95 multiplier",
        "  --strict-baseline               Fail when baseline is missing",
    ]
    .join("\n")
}
