use axum::Router;
use axum::routing::get;
use crm_engine::config::EngineConfig;
use crm_engine::observability::logging;
use engine_infra::error::StartupError;
use engine_infra::hmac::HmacVerifier;
use engine_infra::rate_limit::RateLimiter;
use engine_infra::sqlite::{make_pool, make_readonly_pool};
use lead_service::api::{LeadState, router as lead_router};
use lead_service::service::{CandidateService, ImportService};
use search_service::api::{SearchState, router as search_router};
use search_service::service::SearchService;
use serde::Serialize;
use std::net::SocketAddr;
use std::path::Path;
use std::sync::Arc;

fn load_root_env() {
    let env_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../.env");
    let _ = dotenvy::from_path(env_path);
}

#[tokio::main]
async fn main() {
    if let Err(e) = run().await {
        eprintln!("Error: {e}");
        std::process::exit(1);
    }
}

async fn run() -> Result<(), StartupError> {
    logging::init();
    load_root_env();

    let cfg = EngineConfig::load()?;

    // contacts.sqlite must exist (pipeline-generated); fail fast if absent.
    if !Path::new(&cfg.contacts_db_path).exists() {
        return Err(StartupError::Database(format!(
            "contacts database not found at {}\n  \
            Refresh it with: bun run pipeline:refresh",
            cfg.contacts_db_path
        )));
    }

    // leads.sqlite is created on first run if absent.
    let contacts_pool = make_readonly_pool(&cfg.contacts_db_path)?;
    let leads_pool = make_pool(&cfg.leads_db_path)?;

    {
        let conn = contacts_pool
            .get()
            .map_err(|e| StartupError::Database(format!("pool get failed: {e}")))?;
        search_service::schema_guard::validate(&conn)?;
    }
    {
        let conn = leads_pool
            .get()
            .map_err(|e| StartupError::Database(format!("pool get failed: {e}")))?;
        lead_service::schema_guard::validate(&conn)?;
    }

    let hmac = Arc::new(HmacVerifier::new(
        cfg.hmac_keys.clone(),
        cfg.hmac_max_skew_secs,
    ));
    let limiter = Arc::new(RateLimiter::new(cfg.rate_limit_per_key));

    let search_state = Arc::new(SearchState {
        service: Arc::new(SearchService::new(contacts_pool.clone(), cfg.max_limit)),
        hmac: hmac.clone(),
        limiter: limiter.clone(),
    });
    let lead_state = Arc::new(LeadState {
        service: Arc::new(CandidateService::new(leads_pool.clone(), cfg.max_limit)),
        import_service: Arc::new(ImportService::new(leads_pool.clone())),
        hmac: hmac.clone(),
        limiter: limiter.clone(),
    });

    let contacts_pool_health = contacts_pool.clone();
    let app = Router::new()
        .route(
            "/v1/health",
            get(move || health_handler(contacts_pool_health.clone())),
        )
        .merge(search_router(search_state))
        .merge(lead_router(lead_state));

    let bind = format!("{}:{}", cfg.host, cfg.port);
    let listener = tokio::net::TcpListener::bind(&bind)
        .await
        .map_err(|e| StartupError::Config(format!("bind failed: {e}")))?;

    tracing::info!("engine listening on {bind}");
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .map_err(|e| StartupError::Config(format!("server error: {e}")))
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    build_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    built_at: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    rows: Option<i64>,
}

async fn health_handler(
    pool: engine_infra::sqlite::SqlitePool,
) -> impl axum::response::IntoResponse {
    let result = tokio::task::spawn_blocking(move || -> Option<(Option<String>, i64, i64)> {
        let conn = pool.get().ok()?;
        let _: i64 = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM search_projection LIMIT 1)",
                [],
                |r| r.get(0),
            )
            .ok()?;
        let build_id: Option<String> = conn
            .query_row(
                "SELECT value FROM _pipeline_build WHERE key = 'build_id'",
                [],
                |r| r.get::<_, String>(0),
            )
            .ok();
        let built_at: i64 = conn
            .query_row(
                "SELECT value FROM _pipeline_build WHERE key = 'built_at'",
                [],
                |r| r.get::<_, String>(0),
            )
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);
        let rows: i64 = conn
            .query_row(
                "SELECT value FROM _pipeline_build WHERE key = 'rows'",
                [],
                |r| r.get::<_, String>(0),
            )
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);
        Some((build_id, built_at, rows))
    })
    .await
    .unwrap_or(None);

    match result {
        Some((build_id, built_at, rows)) => (
            axum::http::StatusCode::OK,
            axum::Json(HealthResponse {
                status: "ok",
                build_id,
                built_at: if built_at > 0 { Some(built_at) } else { None },
                rows: Some(rows),
            }),
        ),
        None => (
            axum::http::StatusCode::SERVICE_UNAVAILABLE,
            axum::Json(HealthResponse {
                status: "degraded",
                build_id: None,
                built_at: None,
                rows: None,
            }),
        ),
    }
}
