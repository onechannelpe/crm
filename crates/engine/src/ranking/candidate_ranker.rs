use crate::api::contracts::{CandidateStrategy, LeadCandidate};
use std::collections::HashSet;

pub fn rank_candidates(
    mut input: Vec<LeadCandidate>,
    strategy: CandidateStrategy,
) -> Vec<LeadCandidate> {
    if input.len() <= 1 {
        return input;
    }

    if matches!(strategy, CandidateStrategy::Balanced) {
        input.sort_by_key(|candidate| {
            let seed = format!("{}:{}", candidate.ruc, candidate.dni);
            stable_hash_u64(&seed)
        });
    }

    input
}

pub fn dedupe_candidates(input: Vec<LeadCandidate>) -> Vec<LeadCandidate> {
    let mut seen = HashSet::new();
    let mut output = Vec::with_capacity(input.len());

    for candidate in input {
        let key = format!("{}:{}", candidate.ruc, candidate.dni);
        if seen.insert(key) {
            output.push(candidate);
        }
    }

    output
}

fn stable_hash_u64(value: &str) -> u64 {
    let mut hash: u64 = 1469598103934665603;
    for byte in value.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(1099511628211);
    }
    hash
}
