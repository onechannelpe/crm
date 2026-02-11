use crate::errors::ApiError;
use axum::{extract::Request, middleware::Next, response::Response};
use dashmap::DashMap;
use std::time::{Duration, Instant};

struct TokenBucket {
    tokens: u32,
    capacity: u32,
    last_refill: Instant,
    refill_rate: Duration,
}

impl TokenBucket {
    fn new(capacity: u32, refill_rate: Duration) -> Self {
        Self {
            tokens: capacity,
            capacity,
            last_refill: Instant::now(),
            refill_rate,
        }
    }
    
    fn try_consume(&mut self) -> bool {
        self.refill();
        if self.tokens > 0 {
            self.tokens -= 1;
            true
        } else {
            false
        }
    }
    
    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill);
        let refills = (elapsed.as_secs() / self.refill_rate.as_secs()) as u32;
        
        if refills > 0 {
            self.tokens = (self.tokens + refills).min(self.capacity);
            self.last_refill = now;
        }
    }
}

pub struct RateLimiter {
    buckets: DashMap<String, TokenBucket>,
    capacity: u32,
    refill_rate: Duration,
}

impl RateLimiter {
    pub fn new(requests_per_minute: u32) -> Self {
        Self {
            buckets: DashMap::new(),
            capacity: requests_per_minute,
            refill_rate: Duration::from_secs(60),
        }
    }
    
    pub fn check(&self, key: &str) -> bool {
        self.buckets
            .entry(key.to_string())
            .or_insert_with(|| TokenBucket::new(self.capacity, self.refill_rate))
            .try_consume()
    }
}

pub async fn rate_limit_middleware(
    request: Request,
    next: Next,
) -> Result<Response, ApiError> {
    let limiter = request
        .extensions()
        .get::<std::sync::Arc<RateLimiter>>()
        .cloned()
        .ok_or(ApiError::RateLimitExceeded)?;
    
    let api_key = request
        .headers()
        .get("x-api-key")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown");
    
    if !limiter.check(api_key) {
        return Err(ApiError::RateLimitExceeded);
    }
    
    Ok(next.run(request).await)
}
