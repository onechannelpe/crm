use leads::contracts::{CandidateStrategy, LeadCandidate};
use leads::domain::{dedupe_candidates, rank_candidates};
use proptest::prelude::*;
use std::collections::HashSet;

fn arb_candidate() -> impl Strategy<Value = LeadCandidate> {
    // Small digit strings produce natural duplicates across generated batches.
    (
        "[0-9]{1,3}",
        "[0-9]{1,3}",
        "[a-z]{1,8}",
        "[a-z]{1,8}",
        "[0-9]{7,9}",
    )
        .prop_map(|(ruc, dni, org, person, phone)| LeadCandidate {
            ruc,
            organization_name: org,
            dni,
            person_name: person,
            phone_primary: phone,
        })
}

fn arb_strategy() -> impl Strategy<Value = CandidateStrategy> {
    prop_oneof![
        Just(CandidateStrategy::Balanced),
        Just(CandidateStrategy::Freshness),
        Just(CandidateStrategy::Conversion),
    ]
}

proptest! {
    #[test]
    fn dedupe_produces_unique_ruc_dni_pairs(
        input in prop::collection::vec(arb_candidate(), 0..50),
    ) {
        let output = dedupe_candidates(input);
        let keys: HashSet<_> = output.iter().map(|c| (c.ruc.clone(), c.dni.clone())).collect();
        prop_assert_eq!(keys.len(), output.len());
    }

    #[test]
    fn dedupe_output_is_subset_of_input(
        input in prop::collection::vec(arb_candidate(), 0..50),
    ) {
        let output = dedupe_candidates(input.clone());
        for c in &output {
            prop_assert!(
                input.iter().any(|i| i.ruc == c.ruc && i.dni == c.dni),
                "output candidate not in input"
            );
        }
    }

    #[test]
    fn rank_preserves_element_count(
        input    in prop::collection::vec(arb_candidate(), 0..50),
        strategy in arb_strategy(),
    ) {
        let n      = input.len();
        let output = rank_candidates(input, strategy);
        prop_assert_eq!(output.len(), n);
    }

    #[test]
    fn rank_output_is_permutation_of_input(
        input    in prop::collection::vec(arb_candidate(), 0..50),
        strategy in arb_strategy(),
    ) {
        let output = rank_candidates(input.clone(), strategy);
        for c in &input {
            prop_assert!(
                output.iter().any(|o| o.ruc == c.ruc && o.dni == c.dni && o.phone_primary == c.phone_primary),
                "input candidate missing from ranked output"
            );
        }
    }

    #[test]
    fn dedupe_then_rank_never_exceeds_original_count(
        input    in prop::collection::vec(arb_candidate(), 0..50),
        strategy in arb_strategy(),
    ) {
        let n       = input.len();
        let deduped = dedupe_candidates(input);
        let ranked  = rank_candidates(deduped, strategy);
        prop_assert!(ranked.len() <= n);
    }
}
