use crate::{
    config::ApiKeyEntry, middleware::auth::AuthValidator, middleware::rate::RateLimiter,
    service::LeadService,
};
use std::sync::{Arc, RwLock};

pub struct AppState {
    pub service: Arc<RwLock<LeadService>>,
    pub auth: AuthValidator,
    pub limiter: RateLimiter,
}

impl AppState {
    pub fn new(
        service: LeadService,
        api_keys: Vec<(String, ApiKeyEntry)>,
        rate_limit: u32,
    ) -> Self {
        Self {
            service: Arc::new(RwLock::new(service)),
            auth: AuthValidator::new(api_keys),
            limiter: RateLimiter::new(rate_limit),
        }
    }
}
