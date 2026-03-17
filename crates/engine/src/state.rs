use engine_infra::hmac::HmacVerifier;
use engine_infra::rate_limit::RateLimiter;
use lead_service::service::{CandidateService, ImportService};
use search_service::service::SearchService;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub search: Arc<SearchService>,
    pub candidates: Arc<CandidateService>,
    pub import_service: Arc<ImportService>,
    pub hmac: Arc<HmacVerifier>,
    pub limiter: Arc<RateLimiter>,
}
