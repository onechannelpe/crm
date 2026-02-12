use crate::{
    api::state::AppState, error::Result, middleware::user::UserContext,
    service::types::SearchResult,
};
use axum::{
    Router,
    extract::{Extension, Path, Query, State},
    response::Json,
    routing::get,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Serialize)]
struct SearchResponse {
    results: Vec<SearchResult>,
    quota_remaining: u32,
}

async fn search_dni(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<UserContext>,
    Path(dni): Path<String>,
) -> Result<Json<SearchResponse>> {
    let service = state.service.read().unwrap();
    let (results, quota_remaining) = service.search_dni(user.user_id, &dni)?;

    Ok(Json(SearchResponse {
        results,
        quota_remaining,
    }))
}

async fn search_ruc(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<UserContext>,
    Path(ruc): Path<String>,
) -> Result<Json<SearchResponse>> {
    let service = state.service.read().unwrap();
    let (results, quota_remaining) = service.search_ruc(user.user_id, &ruc)?;

    Ok(Json(SearchResponse {
        results,
        quota_remaining,
    }))
}

async fn search_phone(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<UserContext>,
    Path(phone): Path<String>,
) -> Result<Json<SearchResponse>> {
    let service = state.service.read().unwrap();
    let (results, quota_remaining) = service.search_phone(user.user_id, &phone)?;

    Ok(Json(SearchResponse {
        results,
        quota_remaining,
    }))
}

#[derive(Deserialize)]
struct NameQuery {
    q: String,
    #[serde(default = "default_limit")]
    limit: usize,
}

fn default_limit() -> usize {
    20
}

async fn search_name(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<UserContext>,
    Query(query): Query<NameQuery>,
) -> Result<Json<SearchResponse>> {
    let service = state.service.read().unwrap();
    let (results, quota_remaining) = service.search_name(user.user_id, &query.q, query.limit)?;

    Ok(Json(SearchResponse {
        results,
        quota_remaining,
    }))
}

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/search/dni/{dni}", get(search_dni))
        .route("/search/ruc/{ruc}", get(search_ruc))
        .route("/search/phone/{phone}", get(search_phone))
        .route("/search/name", get(search_name))
}
