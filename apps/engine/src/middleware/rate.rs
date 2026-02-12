use crate::{api::state::AppState, error::Error};
use axum::{
    extract::{Extension, Request},
    middleware::Next,
    response::Response,
};
use dashmap::DashMap;
use std::{
    sync::Arc,
    time::{Duration, Instant},
};

struct Bucket {
    tokens: u32,
    capacity: u32,
    last_refill: Instant,
}

impl Bucket {
    fn new(capacity: u32) -> Self {
        Self {
            tokens: capacity,
            capacity,
            last_refill: Instant::now(),
        }
    }

    fn consume(&mut self) -> bool {
        self.refill();

        if self.tokens > 0 {
            self.tokens -= 1;
            true
        } else {
            false
        }
    }

    fn refill(&mut self) {
        let elapsed = self.last_refill.elapsed();
        let tokens_to_add = (elapsed.as_secs_f64() * (self.capacity as f64 / 60.0)) as u32;

        if tokens_to_add > 0 {
            self.tokens = (self.tokens + tokens_to_add).min(self.capacity);
            let time_used =
                Duration::from_secs_f64(tokens_to_add as f64 * 60.0 / self.capacity as f64);
            self.last_refill += time_used;
        }
    }
}

pub struct RateLimiter {
    buckets: DashMap<String, Bucket>,
    capacity: u32,
}

impl RateLimiter {
    pub fn new(requests_per_minute: u32) -> Self {
        Self {
            buckets: DashMap::new(),
            capacity: requests_per_minute,
        }
    }

    pub fn check(&self, key: &str) -> bool {
        self.buckets
            .entry(key.to_string())
            .or_insert_with(|| Bucket::new(self.capacity))
            .consume()
    }
}

pub async fn rate_limit(
    Extension(state): Extension<Arc<AppState>>,
    request: Request,
    next: Next,
) -> Result<Response, Error> {
    let key = request
        .headers()
        .get("x-api-key")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("anonymous");

    if !state.limiter.check(key) {
        return Err(Error::RateLimit);
    }

    Ok(next.run(request).await)
}
