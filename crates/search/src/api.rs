use crate::contracts::SearchRequest;
use crate::domain;
use crate::service::SearchService;
use axum::body::Bytes;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;
use axum::routing::post;
use axum::Router;
use shared::auth;
use shared::error::ApiError;
use shared::hmac::HmacVerifier;
use shared::rate_limit::RateLimiter;
use std::sync::Arc;

pub struct SearchState {
    pub service: Arc<SearchService>,
    pub hmac: Arc<HmacVerifier>,
    pub limiter: Arc<RateLimiter>,
}

pub fn router(state: Arc<SearchState>) -> Router {
    Router::new()
        .route("/v1/search", post(handle_search))
        .with_state(state)
}

async fn handle_search(
    State(state): State<Arc<SearchState>>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<impl IntoResponse, ApiError> {
    let key_id = auth::verify_signed_request(&headers, &body, &state.hmac, &state.limiter)?;

    let request: SearchRequest = serde_json::from_slice(&body)
        .map_err(|_| ApiError::Validation("invalid JSON body".into()))?;

    let cost = domain::search_cost(request.search_type);
    let limiter_key = format!("search:{key_id}");
    if !state.limiter.allow(&limiter_key, cost) {
        return Err(ApiError::RateLimit);
    }

    let service = state.service.clone();
    let response = tokio::task::spawn_blocking(move || service.search(&request))
        .await
        .map_err(|_| ApiError::Internal)??;

    Ok((StatusCode::OK, axum::Json(response)))
}
