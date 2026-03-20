use proptest::prelude::*;
use shared::rate_limit::RateLimiter;

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
        cost_fraction     in 1u32..=100u32,
    ) {
        let cost    = (tokens_per_minute / cost_fraction).max(1).min(tokens_per_minute);
        let limiter = RateLimiter::new(tokens_per_minute);
        prop_assert!(limiter.allow("key", cost));
    }

    #[test]
    fn exceeding_capacity_is_rejected(
        tokens_per_minute in 1u32..=1_000u32,
    ) {
        let limiter = RateLimiter::new(tokens_per_minute);
        // Drain the bucket completely.
        let _ = limiter.allow("key", tokens_per_minute);
        // One more token should be rejected.
        prop_assert!(!limiter.allow("key", 1));
    }
}
