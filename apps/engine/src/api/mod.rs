mod routes;
pub mod state;

use crate::{
    config::Config,
    error::Result,
    middleware::{
        auth::require_auth,
        rate::rate_limit,
        user::{extract_user, require_admin, require_supervisor},
    },
    service::LeadService,
};
use axum::{Extension, Router, middleware};
use routes::{audit, health, leads, quota, search};
use state::AppState;
use std::sync::Arc;
use tower::ServiceBuilder;
use tower_http::{compression::CompressionLayer, trace::TraceLayer};

pub async fn serve(service: LeadService, config: Config) -> Result<()> {
    let state = Arc::new(AppState::new(
        service,
        config.api_keys,
        config.rate_limit_per_minute,
    ));

    let executive_routes = Router::new()
        .merge(search::routes())
        .merge(leads::my_leads_route());

    let supervisor_routes = Router::new()
        .merge(quota::routes())
        .merge(audit::routes())
        .merge(leads::supervisor_routes())
        .layer(middleware::from_fn(require_supervisor));

    let admin_routes = Router::new()
        .merge(leads::admin_routes())
        .layer(middleware::from_fn(require_admin));

    let protected_routes = Router::new()
        .merge(executive_routes)
        .merge(supervisor_routes)
        .merge(admin_routes)
        .layer(middleware::from_fn(extract_user))
        .layer(middleware::from_fn(rate_limit))
        .layer(middleware::from_fn(require_auth));

    let app = Router::new()
        .merge(health::routes())
        .merge(protected_routes)
        .layer(Extension(state.clone()))
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CompressionLayer::new()),
        )
        .with_state(state);

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .map_err(|e| crate::error::Error::Data(e.to_string()))?;

    axum::serve(listener, app)
        .await
        .map_err(|e| crate::error::Error::Data(e.to_string()))
}
