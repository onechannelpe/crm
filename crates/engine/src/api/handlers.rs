use crate::api::contracts::{HealthResponse, LeadCandidateRequest, SearchRequest, SearchType};
use crate::errors::ApiError;
use crate::state::AppState;
use axum::body::Bytes;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;

pub async fn health(State(state): State<AppState>) -> impl IntoResponse {
    let pool = state.search.pool();
    let result = tokio::task::spawn_blocking(move || -> Option<(Option<String>, i64, i64)> {
        let conn = pool.get().ok()?;
        let _: i64 = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM search_projection LIMIT 1)",
                [],
                |r| r.get(0),
            )
            .ok()?;
        let build_id: Option<String> = conn
            .query_row(
                "SELECT value FROM _pipeline_build WHERE key = 'build_id'",
                [],
                |r| r.get::<_, String>(0),
            )
            .ok();
        let built_at: i64 = conn
            .query_row(
                "SELECT value FROM _pipeline_build WHERE key = 'built_at'",
                [],
                |r| r.get::<_, String>(0),
            )
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);
        let rows: i64 = conn
            .query_row(
                "SELECT value FROM _pipeline_build WHERE key = 'rows'",
                [],
                |r| r.get::<_, String>(0),
            )
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);
        Some((build_id, built_at, rows))
    })
    .await
    .unwrap_or(None);

    match result {
        Some((build_id, built_at, rows)) => (
            StatusCode::OK,
            axum::Json(HealthResponse {
                status: "ok",
                build_id,
                built_at: if built_at > 0 { Some(built_at) } else { None },
                rows: Some(rows),
            }),
        ),
        None => (
            StatusCode::SERVICE_UNAVAILABLE,
            axum::Json(HealthResponse {
                status: "degraded",
                build_id: None,
                built_at: None,
                rows: None,
            }),
        ),
    }
}

pub async fn search(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<impl IntoResponse, ApiError> {
    let key_id = header_required(&headers, "x-key-id")?;
    let ts = header_required(&headers, "x-timestamp")?;
    let sig = header_required(&headers, "x-signature")?;
    if let Err(error) = state.hmac.verify(key_id, ts, sig, &body) {
        let auth_limiter_key = if state.hmac.has_key_id(key_id) {
            format!("auth_fail:{key_id}")
        } else {
            "auth_fail:unknown".to_owned()
        };
        if !state.limiter.allow(&auth_limiter_key, 1) {
            tracing::warn!(key_id, "auth failure rate limit exceeded");
            return Err(ApiError::RateLimit);
        }
        return Err(error);
    }

    let request: SearchRequest = serde_json::from_slice(&body)
        .map_err(|_| ApiError::Validation("invalid JSON body".into()))?;
    let request_cost = search_cost(request.search_type);
    let limiter_key = format!("search:{key_id}");
    if !state.limiter.allow(&limiter_key, request_cost) {
        tracing::warn!(key_id, request_cost, "rate limit exceeded");
        return Err(ApiError::RateLimit);
    }

    let service = state.search.clone();
    let response = tokio::task::spawn_blocking(move || service.search(&request))
        .await
        .map_err(|_| ApiError::Internal)??;

    Ok((StatusCode::OK, axum::Json(response)))
}

pub async fn lead_candidates(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<impl IntoResponse, ApiError> {
    let key_id = header_required(&headers, "x-key-id")?;
    let ts = header_required(&headers, "x-timestamp")?;
    let sig = header_required(&headers, "x-signature")?;
    if let Err(error) = state.hmac.verify(key_id, ts, sig, &body) {
        let auth_limiter_key = if state.hmac.has_key_id(key_id) {
            format!("auth_fail:{key_id}")
        } else {
            "auth_fail:unknown".to_owned()
        };
        if !state.limiter.allow(&auth_limiter_key, 1) {
            tracing::warn!(key_id, "auth failure rate limit exceeded");
            return Err(ApiError::RateLimit);
        }
        return Err(error);
    }

    let request: LeadCandidateRequest = serde_json::from_slice(&body)
        .map_err(|_| ApiError::Validation("invalid JSON body".into()))?;
    let limiter_key = format!("lead_candidates:{key_id}");
    if !state
        .limiter
        .allow(&limiter_key, candidate_cost(request.amount))
    {
        tracing::warn!(key_id, amount = request.amount, "rate limit exceeded");
        return Err(ApiError::RateLimit);
    }

    let service = state.candidates.clone();
    let response = tokio::task::spawn_blocking(move || service.candidates(&request))
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

fn search_cost(search_type: SearchType) -> u32 {
    match search_type {
        SearchType::Dni | SearchType::Ruc | SearchType::Phone => 1,
        SearchType::PhoneEnriched => 2,
        SearchType::PersonName | SearchType::CompanyName => 3,
    }
}

fn candidate_cost(amount: usize) -> u32 {
    ((amount.max(1) as u32) / 10).max(1)
}
