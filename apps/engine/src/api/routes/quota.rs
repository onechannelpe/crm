use crate::{api::state::AppState, error::Result, service::types::QuotaInfo};
use axum::{
    Router,
    extract::{Path, State},
    response::Json,
    routing::{get, post},
};
use serde::Deserialize;
use std::sync::Arc;

async fn get_quota(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<i64>,
) -> Json<QuotaInfo> {
    let service = state.service.read().unwrap();
    Json(service.get_quota(user_id))
}

#[derive(Deserialize)]
struct SetQuotaRequest {
    daily_limit: u32,
}

async fn set_quota(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<i64>,
    Json(req): Json<SetQuotaRequest>,
) -> Result<Json<QuotaInfo>> {
    let service = state.service.read().unwrap();
    service.set_quota(user_id, req.daily_limit);
    Ok(Json(service.get_quota(user_id)))
}

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/quota/:user_id", get(get_quota))
        .route("/quota/:user_id", post(set_quota))
}
