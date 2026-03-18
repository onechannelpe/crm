use crate::contracts::{LeadCandidateRequest, LeadImportRequest};
use crate::service::{CandidateService, ImportService};
use axum::body::Bytes;
use axum::extract::{Request, State};
use axum::http::HeaderValue;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::Router;
use shared::auth;
use shared::error::{ApiError, RequestError};
use shared::hmac::HmacVerifier;
use shared::rate_limit::RateLimiter;
use std::sync::Arc;
use uuid::Uuid;

const IMPORT_BODY_LIMIT: usize = 10 * 1024 * 1024; // 10 MB

pub struct LeadState {
    pub service: Arc<CandidateService>,
    pub import_service: Arc<ImportService>,
    pub hmac: Arc<HmacVerifier>,
    pub limiter: Arc<RateLimiter>,
}

pub fn router(state: Arc<LeadState>) -> Router {
    Router::new()
        .route("/v1/lead-candidates", post(handle_lead_candidates))
        .route("/v1/leads/import", post(handle_import))
        .with_state(state)
}

async fn handle_lead_candidates(
    State(state): State<Arc<LeadState>>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Response, RequestError> {
    let request_id = Uuid::new_v4().to_string();
    handle_lead_candidates_with_request_id(state, headers, body, request_id).await
}

#[tracing::instrument(skip(state, headers, body), fields(request_id = %request_id))]
async fn handle_lead_candidates_with_request_id(
    state: Arc<LeadState>,
    headers: HeaderMap,
    body: Bytes,
    request_id: String,
) -> Result<Response, RequestError> {

    let key_id = auth::verify_signed_request(&headers, &body, &state.hmac, &state.limiter)
        .map_err(|e| e.with_request_id(request_id.clone()))?;

    let req: LeadCandidateRequest = serde_json::from_slice(&body)
        .map_err(|_| ApiError::Validation("invalid JSON body".into()).with_request_id(request_id.clone()))?;

    let limiter_key = format!("lead_candidates:{key_id}");
    if !state
        .limiter
        .allow(&limiter_key, candidate_cost(req.amount))
    {
        return Err(ApiError::RateLimit.with_request_id(request_id));
    }

    let svc = state.service.clone();
    let current_span = tracing::Span::current();
    let response = tokio::task::spawn_blocking(move || current_span.in_scope(|| svc.candidates(&req)))
        .await
        .map_err(|_| ApiError::Internal.with_request_id(request_id.clone()))?
        .map_err(|e| e.with_request_id(request_id.clone()))?;

    Ok(attach_request_id(
        (StatusCode::OK, axum::Json(response)).into_response(),
        &request_id,
    ))
}

async fn handle_import(
    State(state): State<Arc<LeadState>>,
    headers: HeaderMap,
    request: Request,
) -> Result<Response, RequestError> {
    let request_id = Uuid::new_v4().to_string();
    handle_import_with_request_id(state, headers, request, request_id).await
}

#[tracing::instrument(skip(state, headers, request), fields(request_id = %request_id))]
async fn handle_import_with_request_id(
    state: Arc<LeadState>,
    headers: HeaderMap,
    request: Request,
    request_id: String,
) -> Result<Response, RequestError> {

    // Collect body with size cap before HMAC verification.
    let body = axum::body::to_bytes(request.into_body(), IMPORT_BODY_LIMIT)
        .await
        .map_err(|_| ApiError::Validation("request body too large".into()).with_request_id(request_id.clone()))?;

    let key_id = auth::verify_signed_request(&headers, &body, &state.hmac, &state.limiter)
        .map_err(|e| e.with_request_id(request_id.clone()))?;

    let req: LeadImportRequest = serde_json::from_slice(&body)
        .map_err(|_| ApiError::Validation("invalid JSON body".into()).with_request_id(request_id.clone()))?;

    let limiter_key = format!("leads_import:{key_id}");
    if !state
        .limiter
        .allow(&limiter_key, import_cost(req.rows.len()))
    {
        return Err(ApiError::RateLimit.with_request_id(request_id));
    }

    let svc = state.import_service.clone();
    let current_span = tracing::Span::current();
    let response = tokio::task::spawn_blocking(move || current_span.in_scope(|| svc.import_leads(&req)))
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

fn candidate_cost(amount: usize) -> u32 {
    let requested = u32::try_from(amount).unwrap_or(u32::MAX).max(1);
    requested.div_ceil(10)
}

fn import_cost(row_count: usize) -> u32 {
    let rows = u32::try_from(row_count).unwrap_or(u32::MAX).max(1);
    rows.div_ceil(100)
}
