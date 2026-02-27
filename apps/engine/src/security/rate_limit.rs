use dashmap::DashMap;
use std::time::{Duration, Instant};

#[derive(Debug)]
struct Bucket {
    count: u32,
    reset_at: Instant,
}

#[derive(Debug)]
pub struct RateLimiter {
    per_minute: u32,
    buckets: DashMap<String, Bucket>,
}

impl RateLimiter {
    pub fn new(per_minute: u32) -> Self {
        Self {
            per_minute,
            buckets: DashMap::new(),
        }
    }

    pub fn allow(&self, key: &str) -> bool {
        let now = Instant::now();

        // Hot path: IP already known — borrow via &str, no allocation.
        if let Some(mut bucket) = self.buckets.get_mut(key) {
            if now >= bucket.reset_at {
                bucket.count = 0;
                bucket.reset_at = now + Duration::from_secs(60);
            }
            if bucket.count >= self.per_minute {
                return false;
            }
            bucket.count += 1;
            return true;
        }

        // Cold path: first request from this IP — allocate once.
        self.buckets.entry(key.to_string()).or_insert(Bucket {
            count: 1,
            reset_at: now + Duration::from_secs(60),
        });
        true
    }
}
