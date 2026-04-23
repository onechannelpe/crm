use crate::contracts::{CandidateStrategy, RecordCandidate};
use std::collections::HashSet;

/// Sorts candidates according to `strategy`.
/// `Balanced` produces a deterministic pseudo-random order seeded by ruc+dni.
/// `Freshness` and `Conversion` ordering is applied at the SQL layer; this
/// function is a no-op for those strategies so the list passes through unchanged.
pub fn rank_candidates(
    mut input: Vec<RecordCandidate>,
    strategy: CandidateStrategy,
) -> Vec<RecordCandidate> {
    if matches!(strategy, CandidateStrategy::Balanced) {
        input.sort_by_key(|c| stable_hash(format!("{}:{}", c.ruc, c.dni).as_bytes()));
    }
    input
}

/// Removes duplicates, keeping the first occurrence of each (ruc, dni) pair.
pub fn dedupe_candidates(input: Vec<RecordCandidate>) -> Vec<RecordCandidate> {
    let mut seen = HashSet::new();
    let mut output = Vec::with_capacity(input.len());
    for c in input {
        let key = format!("{}:{}", c.ruc, c.dni);
        if seen.insert(key) {
            output.push(c);
        }
    }
    output
}

/// FNV-1a 64-bit (ref: https://ssojet.com/hashing/fnv-1-in-rust)
/// Fast, stable across runs, no external dependency.
fn stable_hash(bytes: &[u8]) -> u64 {
    let mut hash: u64 = 14695981039346656037;
    for &b in bytes {
        hash ^= b as u64;
        hash = hash.wrapping_mul(1099511628211);
    }
    hash
}
