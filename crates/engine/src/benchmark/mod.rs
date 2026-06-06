//! Benchmark report contracts and helpers shared by the benchmark binary.

mod compare;
mod contract;
mod input;

pub use compare::{BenchmarkDecision, BenchmarkVerdict, compare_to_baseline};
pub use contract::{
    BenchmarkMode, BenchmarkSummary, CONTRACT_VERSION, DEFAULT_FULL_ITERATIONS,
    DEFAULT_FULL_THRESHOLD_FACTOR, DEFAULT_SMOKE_ITERATIONS, DEFAULT_SMOKE_THRESHOLD_FACTOR,
    QueryMetrics, percentile,
};
pub use input::{DatasetManifest, Workload, read_manifest, read_workload, sha256_file};
