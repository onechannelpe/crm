//! HTTP server configuration and routing
//! 
//! Sets up Axum router with middleware and routes.
//! Separates server concerns from application logic.

use crate::{
    handlers::{health_handler, lookup_dni_handler, lookup_phone_handler, lookup_ruc_handler, stats_handler},
    service::PhoneLookupService,
};
use axum::{
    http::Method,
    routing::get,
    Router,
};
use std::sync::Arc;
use tower::ServiceBuilder;
use tower_http::{
    cors::{Any, CorsLayer},
    compression::CompressionLayer,
    trace::TraceLayer,
};
use tracing::info;

pub struct ServerConfig {
    pub host: String,
    pub port: String,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: "0.0.0.0".to_string(),
            port: "3000".to_string(),
        }
    }
}

pub fn create_router(service: Arc<PhoneLookupService>) -> Router {
    // Core lookup routes
    let app = Router::new()
        .route("/lookup/dni/:dni", get(lookup_dni_handler))
        .route("/lookup/ruc/:ruc", get(lookup_ruc_handler))
        .route("/lookup/phone/:phone", get(lookup_phone_handler))
        .route("/health", get(health_handler))
        .route("/stats", get(stats_handler))
        .with_state(service);
    
    // Add middleware layers for production
    app.layer(
        ServiceBuilder::new()
            .layer(TraceLayer::new_for_http())
            .layer(CompressionLayer::new())
            .layer(
                CorsLayer::new()
                    .allow_origin(Any)
                    .allow_methods([Method::GET])
                    .allow_headers(Any),
            ),
    )
}

pub async fn start_server(service: Arc<PhoneLookupService>, config: ServerConfig) -> Result<(), Box<dyn std::error::Error>> {
    let app = create_router(service);
    let addr = format!("{}:{}", config.host, config.port);
    
    info!("🌐 Server starting on http://{}", addr);
    info!("📡 Available endpoints:");
    info!("   GET /lookup/dni/{{dni}}     - Lookup by DNI");
    info!("   GET /lookup/ruc/{{ruc}}     - Lookup by RUC");
    info!("   GET /lookup/phone/{{phone}} - Lookup by phone");
    info!("   GET /health                 - Health check");
    info!("   GET /stats                  - Service statistics");
    
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;
    
    Ok(())
}
