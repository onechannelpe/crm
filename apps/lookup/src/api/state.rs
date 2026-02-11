use crate::{middleware::auth::AuthValidator, middleware::rate::RateLimiter, service::LeadService};
use std::sync::Arc;

pub struct AppState {
    pub service: Arc<LeadService>,
    pub auth: AuthValidator,
    pub limiter: RateLimiter,
}

impl AppState {
    pub fn new(service: Arc<LeadService>, api_keys: Vec<String>, rate_limit: u32) -> Self {
        Self {
            service,
            auth: AuthValidator::new(api_keys),
            limiter: RateLimiter::new(rate_limit),
        }
    }
}
