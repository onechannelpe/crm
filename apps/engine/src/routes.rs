use crate::config::Config;
use crate::error::{RequestError, StartupError};
use crate::hmac_auth::{HmacVerifier, require_hmac};
use crate::rate_limit::{IpRateLimiter, rate_limit};
use crate::search;
use crate::search_index::SearchIndex;
use crate::types::{HealthResponse, SearchRequest, SearchResponse, SearchType};
use crate::validation;
use axum::response::Json;
use axum::{Extension, Router, middleware};
use std::sync::Arc;
use tower::ServiceBuilder;
use tower_http::compression::CompressionLayer;
use tower_http::trace::TraceLayer;

async fn handle_search(
    Extension(index): Extension<Arc<SearchIndex>>,
    Json(body): Json<SearchRequest>,
) -> Result<Json<SearchResponse>, RequestError> {
    let results = match body.search_type {
        SearchType::Dni => {
            validation::validate_dni(&body.value)?;
            search::by_dni(&index, &body.value)
        }
        SearchType::Ruc => {
            validation::validate_ruc(&body.value)?;
            search::by_ruc(&index, &body.value)
        }
        SearchType::Phone => {
            validation::validate_phone(&body.value)?;
            search::by_phone(&index, &body.value)
        }
        SearchType::Name => {
            validation::validate_name(&body.value)?;
            search::by_name(&index, &body.value, body.limit)
        }
    };

    let count = results.len();
    Ok(Json(SearchResponse { results, count }))
}

async fn handle_health(
    Extension(index): Extension<Arc<SearchIndex>>,
) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        records: index.record_count(),
    })
}

pub async fn serve(index: SearchIndex, config: Config) -> Result<(), StartupError> {
    let index = Arc::new(index);
    let hmac = Arc::new(HmacVerifier::new(&config.hmac_secret));
    let limiter = Arc::new(IpRateLimiter::new(config.rate_limit_per_ip));

    let search_routes = Router::new()
        .route("/search", axum::routing::post(handle_search))
        .layer(middleware::from_fn(require_hmac))
        .layer(middleware::from_fn(rate_limit));

    let app = Router::new()
        .merge(search_routes)
        .route("/health", axum::routing::get(handle_health))
        .layer(Extension(index))
        .layer(Extension(hmac))
        .layer(Extension(limiter))
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CompressionLayer::new()),
        );

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .map_err(|e| StartupError::Server(e.to_string()))?;

    axum::serve(listener, app)
        .await
        .map_err(|e| StartupError::Server(e.to_string()))
}
