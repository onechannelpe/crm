use crate::{api::state::AppState, service::audit::SearchEntry};
use axum::{
    Router,
    extract::{Path, Query, State},
    response::Json,
    routing::get,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Deserialize)]
struct AuditQuery {
    #[serde(default = "default_limit")]
    limit: usize,
}

fn default_limit() -> usize {
    100
}

#[derive(Serialize)]
struct AuditResponse {
    searches: Vec<SearchEntry>,
    count: usize,
}

async fn get_audit(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<i64>,
    Query(query): Query<AuditQuery>,
) -> Json<AuditResponse> {
    let service = state.service.read().unwrap();
    let searches = service.get_audit(user_id, query.limit);
    let count = searches.len();

    Json(AuditResponse { searches, count })
}

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/audit/{user_id}", get(get_audit))
}
