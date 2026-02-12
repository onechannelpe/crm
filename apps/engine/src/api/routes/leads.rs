use crate::{
    api::state::AppState,
    error::Result,
    middleware::user::UserContext,
    service::types::{AssignRequest, Lead, Stats},
};
use axum::{
    Router,
    extract::{Extension, Query, State},
    response::Json,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Serialize)]
struct LeadList {
    leads: Vec<Lead>,
    count: usize,
}

async fn get_my_leads(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<UserContext>,
) -> Json<LeadList> {
    let service = state.service.read().unwrap();
    let leads = service.get_my_leads(user.user_id);
    let count = leads.len();

    Json(LeadList { leads, count })
}

pub fn my_leads_route() -> Router<Arc<AppState>> {
    Router::new().route("/leads/mine", get(get_my_leads))
}

#[derive(Deserialize)]
struct UnassignedQuery {
    #[serde(default = "default_limit")]
    limit: usize,
}

fn default_limit() -> usize {
    10
}

async fn get_unassigned(
    State(state): State<Arc<AppState>>,
    Query(query): Query<UnassignedQuery>,
) -> Json<LeadList> {
    let service = state.service.read().unwrap();
    let limit = query.limit.min(100);
    let leads = service.get_unassigned(limit);
    let count = leads.len();

    Json(LeadList { leads, count })
}

#[derive(Serialize)]
struct AssignResponse {
    assigned: usize,
}

async fn assign(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<UserContext>,
    Json(req): Json<AssignRequest>,
) -> Result<Json<AssignResponse>> {
    let mut service = state.service.write().unwrap();
    let count = service.mark_assigned(req.assigned_to, user.user_id, req.lead_ids);

    Ok(Json(AssignResponse { assigned: count }))
}

pub fn supervisor_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/leads/unassigned", get(get_unassigned))
        .route("/leads/assign", post(assign))
}

async fn stats(State(state): State<Arc<AppState>>) -> Json<Stats> {
    let service = state.service.read().unwrap();
    Json(service.stats())
}

pub fn admin_routes() -> Router<Arc<AppState>> {
    Router::new().route("/stats", get(stats))
}
