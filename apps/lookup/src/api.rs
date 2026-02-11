use crate::{
    auth::{auth_middleware, AuthService},
    config::Config,
    errors::{ApiError, ApiResult},
    rate_limit::{rate_limit_middleware, RateLimiter},
    service::SearcherService,
    types::{AssignRequest, LeadResponse, ServiceStats},
};
use axum::{
    extract::{Query, State},
    http::Method,
    middleware,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::Deserialize;
use std::sync::Arc;
use tower::ServiceBuilder;
use tower_http::{
    compression::CompressionLayer,
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing::info;

#[derive(Deserialize)]
struct LimitQuery {
    limit: Option<usize>,
}

async fn get_unassigned(
    Query(params): Query<LimitQuery>,
    State(service): State<Arc<SearcherService>>,
) -> ApiResult<Json<LeadResponse>> {
    let limit = params.limit.unwrap_or(10).min(100);
    Ok(Json(service.get_unassigned(limit)))
}

async fn mark_assigned(
    State(service): State<Arc<SearcherService>>,
    Json(payload): Json<AssignRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let count = service.mark_assigned(payload.lead_ids);
    Ok(Json(serde_json::json!({ "assigned": count })))
}

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "crm_searcher",
        "version": "2.0.0"
    }))
}

async fn stats(State(service): State<Arc<SearcherService>>) -> Json<ServiceStats> {
    Json(service.stats())
}

pub async fn start_server(
    service: Arc<SearcherService>,
    config: Config,
) -> Result<(), Box<dyn std::error::Error>> {
    let auth_service = Arc::new(AuthService::new(config.api_keys));
    let rate_limiter = Arc::new(RateLimiter::new(config.rate_limit_per_minute));
    
    let app = Router::new()
        .route("/leads/unassigned", get(get_unassigned))
        .route("/leads/assign", post(mark_assigned))
        .route("/stats", get(stats))
        .route_layer(middleware::from_fn(rate_limit_middleware))
        .route_layer(middleware::from_fn(auth_middleware))
        .route("/health", get(health))
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CompressionLayer::new())
                .layer(
                    CorsLayer::new()
                        .allow_origin(Any)
                        .allow_methods([Method::GET, Method::POST])
                        .allow_headers(Any),
                ),
        )
        .with_state(service)
        .layer(axum::Extension(auth_service))
        .layer(axum::Extension(rate_limiter));
    
    let addr = format!("{}:{}", config.host, config.port);
    info!("🌐 Searcher API listening on http://{}", addr);
    
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;
    
    Ok(())
}
