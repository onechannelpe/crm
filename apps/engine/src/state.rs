use crate::domain::search_service::SearchService;
use crate::security::hmac::HmacVerifier;
use crate::security::rate_limit::RateLimiter;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub search: Arc<SearchService>,
    pub hmac: Arc<HmacVerifier>,
    pub limiter: Arc<RateLimiter>,
}
