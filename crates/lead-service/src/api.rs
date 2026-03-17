use crate::contracts::{LeadCandidateRequest, LeadImportRequest};
use crate::service::{CandidateService, ImportService};
use axum::body::Bytes;
use axum::extract::{Request, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;
use axum::routing::post;
use axum::Router;
use engine_infra::error::ApiError;
use engine_infra::hmac::HmacVerifier;
use engine_infra::rate_limit::RateLimiter;
use std::sync::Arc;

const IMPORT_BODY_LIMIT: usize = 10 * 1024 * 1024; // 10MB

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

    let request: LeadCandidateRequest = serde_json::from_slice(&body)
        .map_err(|_| ApiError::Validation("invalid JSON body".into()))?;
    let cost = candidate_cost(request.amount);
    let limiter_key = format!("lead_candidates:{key_id}");
    if !state.limiter.allow(&limiter_key, cost) {
        return Err(ApiError::RateLimit);
    }

    let service = state.service.clone();
    let response = tokio::task::spawn_blocking(move || service.candidates(&request))
        .await
        .map_err(|_| ApiError::Internal)??;

    Ok((StatusCode::OK, axum::Json(response)))
}

async fn handle_import(
    State(state): State<Arc<LeadState>>,
    headers: HeaderMap,
    request: Request,
) -> Result<impl IntoResponse, ApiError> {
    let key_id = header_required(&headers, "x-key-id")?;
    let ts = header_required(&headers, "x-timestamp")?;
    let sig = header_required(&headers, "x-signature")?;

    // Collect body with size limit before HMAC verification.
    let body = axum::body::to_bytes(request.into_body(), IMPORT_BODY_LIMIT)
        .await
        .map_err(|_| ApiError::Validation("request body too large or unreadable".into()))?;

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

    let import_req: LeadImportRequest = serde_json::from_slice(&body)
        .map_err(|_| ApiError::Validation("invalid JSON body".into()))?;
    let cost = import_cost(import_req.rows.len());
    let limiter_key = format!("leads_import:{key_id}");
    if !state.limiter.allow(&limiter_key, cost) {
        return Err(ApiError::RateLimit);
    }

    let svc = state.import_service.clone();
    let response = tokio::task::spawn_blocking(move || svc.import_leads(&import_req))
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

fn candidate_cost(amount: usize) -> u32 {
    ((amount.max(1) as u32) / 10).max(1)
}

fn import_cost(row_count: usize) -> u32 {
    ((row_count as u32) / 100).max(1)
}
