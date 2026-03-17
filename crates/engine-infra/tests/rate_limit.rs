use engine_infra::rate_limit::RateLimiter;
use proptest::prelude::*;

proptest! {
    #[test]
    fn zero_cost_always_allowed(
        tokens_per_minute in 1u32..=10_000u32,
        key in "[a-z]{4,12}",
    ) {
        let limiter = RateLimiter::new(tokens_per_minute);
        prop_assert!(limiter.allow(&key, 0));
    }

    #[test]
    fn first_call_within_capacity_is_allowed(
        tokens_per_minute in 1u32..=10_000u32,
        cost_fraction in 1u32..=100u32,
    ) {
        // cost is at most tokens_per_minute (capacity)
        let cost = (tokens_per_minute / cost_fraction).max(1).min(tokens_per_minute);
        let limiter = RateLimiter::new(tokens_per_minute);
        prop_assert!(limiter.allow("key", cost));
    }
}
