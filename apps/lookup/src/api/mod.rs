mod routes;
pub mod state;

use crate::{config::Config, error::Result, service::LeadService};
use axum::{Extension, Router};
use routes::{health, leads};
use state::AppState;
use std::sync::Arc;
use tower::ServiceBuilder;
use tower_http::{compression::CompressionLayer, trace::TraceLayer};

pub async fn serve(service: Arc<LeadService>, config: Config) -> Result<()> {
    let state = Arc::new(AppState::new(service, config.api_keys, config.rate_limit_per_minute));
    
    let app = Router::new()
        .merge(health::routes())
        .merge(leads::routes())
        .layer(Extension(state.clone()))
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CompressionLayer::new()),
        )
        .with_state(state);
    
    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(&addr).await
        .map_err(|e| crate::error::Error::Data(e.to_string()))?;
    
    axum::serve(listener, app).await
        .map_err(|e| crate::error::Error::Data(e.to_string()))
}
