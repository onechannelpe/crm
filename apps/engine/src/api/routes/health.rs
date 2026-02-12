use axum::{routing::get, Json, Router};
use serde_json::{json, Value};

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
