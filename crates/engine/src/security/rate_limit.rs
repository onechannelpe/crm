use dashmap::DashMap;
use std::time::Instant;

#[derive(Debug)]
struct Bucket {
    tokens: f64,
    last_refill_at: Instant,
}

#[derive(Debug)]
pub struct RateLimiter {
    tokens_per_minute: u32,
    capacity: f64,
    buckets: DashMap<String, Bucket>,
}

impl RateLimiter {
    pub fn new(tokens_per_minute: u32) -> Self {
        let capacity = tokens_per_minute as f64;
        Self {
            tokens_per_minute,
            capacity,
            buckets: DashMap::new(),
        }
    }

    pub fn allow(&self, key: &str, cost: u32) -> bool {
        if cost == 0 {
            return true;
        }

        let now = Instant::now();
        let cost = cost as f64;
        let refill_per_second = self.tokens_per_minute as f64 / 60.0;

        if let Some(mut bucket) = self.buckets.get_mut(key) {
            let elapsed = now.duration_since(bucket.last_refill_at).as_secs_f64();
            let refilled_tokens = (bucket.tokens + elapsed * refill_per_second).min(self.capacity);
            bucket.tokens = refilled_tokens;
            bucket.last_refill_at = now;

            if bucket.tokens < cost {
                return false;
            }
            bucket.tokens -= cost;
            return true;
        }

        self.buckets.entry(key.to_string()).or_insert(Bucket {
            tokens: (self.capacity - cost).max(0.0),
            last_refill_at: now,
        });
        cost <= self.capacity
    }
}
