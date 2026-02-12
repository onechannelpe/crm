use crate::{
    api::state::AppState,
    error::Result,
    middleware::{auth::require_auth, rate::rate_limit},
    service::types::{AssignRequest, Lead, Stats},
};
use axum::{
    Router,
    extract::{Query, State},
    middleware,
    response::Json,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Deserialize)]
struct LeadQuery {
    limit: Option<usize>,
}

#[derive(Serialize)]
struct LeadList {
    leads: Vec<Lead>,
    count: usize,
}

async fn get_unassigned(
    Query(query): Query<LeadQuery>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<LeadList>> {
    let limit = query.limit.unwrap_or(10).min(100);
    let leads = state.service.get_unassigned(limit);
    let count = leads.len();

    Ok(Json(LeadList { leads, count }))
}

#[derive(Serialize)]
struct AssignResponse {
    assigned: usize,
}

async fn assign(
    State(state): State<Arc<AppState>>,
    Json(req): Json<AssignRequest>,
) -> Result<Json<AssignResponse>> {
    let count = state.service.mark_assigned(req.lead_ids);
    Ok(Json(AssignResponse { assigned: count }))
}

async fn stats(State(state): State<Arc<AppState>>) -> Json<Stats> {
    Json(state.service.stats())
}

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/leads/unassigned", get(get_unassigned))
        .route("/leads/assign", post(assign))
        .route("/stats", get(stats))
        .layer(middleware::from_fn(rate_limit))
        .layer(middleware::from_fn(require_auth))
}
