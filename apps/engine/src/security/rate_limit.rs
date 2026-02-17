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
        let mut entry = self.buckets.entry(key.to_string()).or_insert(Bucket {
            count: 0,
            reset_at: now + Duration::from_secs(60),
        });

        if now >= entry.reset_at {
            entry.count = 0;
            entry.reset_at = now + Duration::from_secs(60);
        }

        if entry.count >= self.per_minute {
            return false;
        }
        entry.count += 1;
        true
    }
}
