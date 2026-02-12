use axum::{Json, Router, routing::get};
use serde_json::{Value, json};

async fn handler() -> Json<Value> {
    Json(json!({
        "status": "healthy",
        "service": "lead_lookup",
        "version": env!("CARGO_PKG_VERSION")
    }))
}

pub fn routes() -> Router<std::sync::Arc<crate::api::state::AppState>> {
    Router::new().route("/health", get(handler))
}
