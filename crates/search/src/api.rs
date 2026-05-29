use crate::contracts::SearchRequest;
use crate::domain;
use crate::service::SearchService;
use axum::Router;
use axum::body::Bytes;
use axum::extract::State;
use axum::http::HeaderValue;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use shared::auth;
use shared::error::{ApiError, RequestError};
use shared::hmac::HmacVerifier;
use shared::rate_limit::RateLimiter;
use std::sync::Arc;
use uuid::Uuid;

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
) -> Result<Response, RequestError> {
    let request_id = Uuid::new_v4().to_string();
    handle_search_with_request_id(state, headers, body, request_id).await
}

#[tracing::instrument(skip(state, headers, body), fields(request_id = %request_id))]
async fn handle_search_with_request_id(
    state: Arc<SearchState>,
    headers: HeaderMap,
    body: Bytes,
    request_id: String,
) -> Result<Response, RequestError> {
    let key_id = auth::verify_signed_request(&headers, &body, &state.hmac, &state.limiter)
        .map_err(|e| e.with_request_id(request_id.clone()))?;

    let request: SearchRequest = serde_json::from_slice(&body).map_err(|_| {
        ApiError::Validation("invalid JSON body".into()).with_request_id(request_id.clone())
    })?;

    let cost = domain::search_cost(request.intent, &request.query)
        .map_err(|e| e.with_request_id(request_id.clone()))?;
    let limiter_key = format!("search:{key_id}");
    if !state.limiter.allow(&limiter_key, cost) {
        return Err(ApiError::RateLimit.with_request_id(request_id));
    }

    let service = state.service.clone();
    let current_span = tracing::Span::current();
    let response =
        tokio::task::spawn_blocking(move || current_span.in_scope(|| service.search(&request)))
            .await
            .map_err(|_| ApiError::Internal.with_request_id(request_id.clone()))?
            .map_err(|e| e.with_request_id(request_id.clone()))?;

    Ok(attach_request_id(
        (StatusCode::OK, axum::Json(response)).into_response(),
        &request_id,
    ))
}

fn attach_request_id(mut response: Response, request_id: &str) -> Response {
    if let Ok(value) = HeaderValue::from_str(request_id) {
        response.headers_mut().insert("x-request-id", value);
    }
    response
}
