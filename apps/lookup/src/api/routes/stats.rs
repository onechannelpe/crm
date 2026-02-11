use crate::{api::state::AppState, service::types::Stats};
use axum::{extract::State, response::Json, routing::get, Router};
use std::sync::Arc;

async fn handler(State(state): State<Arc<AppState>>) -> Json<Stats> {
    Json(state.service.stats())
}

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/stats", get(handler))
}
