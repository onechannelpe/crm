use crate::api::contract::{API_PREFIX, API_VERSION, HEALTH_ENDPOINT, SEARCH_ENDPOINT};
use crate::api::handlers::{handle_health, handle_search};
use crate::config::Config;
use crate::error::StartupError;
use crate::hmac_auth::{HmacVerifier, require_hmac};
use crate::rate_limit::{IpRateLimiter, rate_limit};
use crate::search_index::SearchIndex;
use axum::{Extension, Router, middleware};
use std::sync::Arc;
use tower::ServiceBuilder;
use tower_http::compression::CompressionLayer;
use tower_http::trace::TraceLayer;

pub async fn serve(index: SearchIndex, config: Config) -> Result<(), StartupError> {
    let index = Arc::new(index);
    let hmac = Arc::new(HmacVerifier::new(&config.hmac_secret));
    let limiter = Arc::new(IpRateLimiter::new(config.rate_limit_per_ip));

    let protected_routes = Router::new()
        .route(SEARCH_ENDPOINT, axum::routing::post(handle_search))
        .layer(middleware::from_fn(require_hmac))
        .layer(middleware::from_fn(rate_limit));

    let public_routes = Router::new().route(HEALTH_ENDPOINT, axum::routing::get(handle_health));

    let app = Router::new()
        .nest(API_PREFIX, public_routes.merge(protected_routes))
        .layer(Extension(index))
        .layer(Extension(hmac))
        .layer(Extension(limiter))
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CompressionLayer::new()),
        );

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("listening on {} ({})", addr, API_PREFIX);
    tracing::info!("engine API version: {}", API_VERSION);

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .map_err(|e| StartupError::Server(e.to_string()))?;

    axum::serve(listener, app)
        .await
        .map_err(|e| StartupError::Server(e.to_string()))
}
