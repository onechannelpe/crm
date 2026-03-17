use crate::api::handlers;
use crate::state::AppState;
use axum::Router;
use axum::routing::{get, post};

pub const API_PREFIX: &str = "/v1";

pub fn build_router(state: AppState) -> Router {
    Router::new()
        .route(&format!("{API_PREFIX}/health"), get(handlers::health))
        .route(
            &format!("{API_PREFIX}/lead-candidates"),
            post(handlers::lead_candidates),
        )
        .route(&format!("{API_PREFIX}/search"), post(handlers::search))
        .with_state(state)
}
