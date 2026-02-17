use crate::api::contracts::{HealthResponse, SearchRequest};
use crate::errors::ApiError;
use crate::state::AppState;
use axum::body::Bytes;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;

pub async fn health() -> impl IntoResponse {
    axum::Json(HealthResponse { status: "ok" })
}

pub async fn search(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<impl IntoResponse, ApiError> {
    let client_key = client_key(&headers);
    if !state.limiter.allow(&client_key) {
        return Err(ApiError::RateLimit);
    }

    let ts = header_required(&headers, "x-timestamp")?;
    let sig = header_required(&headers, "x-signature")?;
    state.hmac.verify(ts, sig, &body)?;

    let request: SearchRequest = serde_json::from_slice(&body)
        .map_err(|_| ApiError::Validation("invalid JSON body".into()))?;

    let service = state.search.clone();
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

fn client_key(headers: &HeaderMap) -> String {
    headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|raw| raw.split(',').next())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "unknown".to_string())
}
