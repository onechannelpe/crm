use crate::contracts::SearchRequest;
use crate::domain;
use crate::service::SearchService;
use axum::Router;
use axum::body::Bytes;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;
use axum::routing::post;
use engine_infra::error::ApiError;
use engine_infra::hmac::HmacVerifier;
use engine_infra::rate_limit::RateLimiter;
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
    let key_id = header_required(&headers, "x-key-id")?;
    let ts = header_required(&headers, "x-timestamp")?;
    let sig = header_required(&headers, "x-signature")?;

    if let Err(error) = state.hmac.verify(key_id, ts, sig, &body) {
        let auth_key = if state.hmac.has_key_id(key_id) {
            format!("auth_fail:{key_id}")
        } else {
            "auth_fail:unknown".to_owned()
        };
        if !state.limiter.allow(&auth_key, 1) {
            return Err(ApiError::RateLimit);
        }
        return Err(error);
    }

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

fn header_required<'a>(headers: &'a HeaderMap, name: &str) -> Result<&'a str, ApiError> {
    headers
        .get(name)
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| ApiError::Unauthorized(format!("missing header: {name}")))
}
