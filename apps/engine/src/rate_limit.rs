use crate::error::RequestError;
use axum::{extract::Request, middleware::Next, response::Response};
use dashmap::DashMap;
use std::net::IpAddr;
use std::sync::Arc;
use std::time::{Duration, Instant};

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
        let elapsed = self.last_refill.elapsed();
        let to_add = (elapsed.as_secs_f64() * (self.capacity as f64 / 60.0)) as u32;

        if to_add > 0 {
            self.tokens = (self.tokens + to_add).min(self.capacity);
            let used = Duration::from_secs_f64(to_add as f64 * 60.0 / self.capacity as f64);
            self.last_refill += used;
        }
    }
}

pub struct IpRateLimiter {
    buckets: DashMap<IpAddr, Bucket>,
    capacity: u32,
}

impl IpRateLimiter {
    pub fn new(requests_per_minute: u32) -> Self {
        Self {
            buckets: DashMap::new(),
            capacity: requests_per_minute,
        }
    }

    fn check(&self, ip: IpAddr) -> bool {
        self.buckets
            .entry(ip)
            .or_insert_with(|| Bucket::new(self.capacity))
            .try_consume()
    }
}

pub async fn rate_limit(request: Request, next: Next) -> Result<Response, RequestError> {
    let limiter = request
        .extensions()
        .get::<Arc<IpRateLimiter>>()
        .cloned()
        .ok_or(RequestError::RateLimited)?;

    let ip = extract_ip(&request);

    if !limiter.check(ip) {
        return Err(RequestError::RateLimited);
    }

    Ok(next.run(request).await)
}

fn extract_ip(request: &Request) -> IpAddr {
    request
        .headers()
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.split(',').next())
        .and_then(|v| v.trim().parse().ok())
        .unwrap_or(IpAddr::from([127, 0, 0, 1]))
}
