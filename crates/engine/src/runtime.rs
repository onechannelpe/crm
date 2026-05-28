use axum::Router;
use axum::routing::get;
use leads::api::{RecordState, router as record_router};
use leads::repo::SqliteLeadsRepository;
use leads::service::{CandidateService, ImportService};
use search::api::{SearchState, router as search_router};
use search::query::sqlite::SqliteSearchRepository;
use search::service::SearchService;
use shared::error::StartupError;
use shared::hmac::HmacVerifier;
use shared::rate_limit::RateLimiter;
use shared::sqlite::{make_pool, make_readonly_pool};
use std::net::SocketAddr;
use std::path::Path;
use std::sync::Arc;

use crate::config::EngineConfig;
use crate::health;
use crate::observability;

pub async fn run() -> Result<(), StartupError> {
    observability::init_tracing();
    load_root_env();

    let cfg = EngineConfig::load()?;

    if !Path::new(&cfg.contacts_db_path).exists() {
        return Err(StartupError::Database(format!(
            "contacts database not found at {}\n  \
            Refresh it with: bun run pipeline:refresh",
            cfg.contacts_db_path
        )));
    }

    let contacts_pool = make_readonly_pool(&cfg.contacts_db_path)?;
    let leads_pool = make_pool(&cfg.leads_db_path)?;

    {
        let conn = contacts_pool
            .get()
            .map_err(|e| StartupError::Database(format!("pool get failed: {e}")))?;
        search::validate_schema(&conn)?;
    }
    {
        let conn = leads_pool
            .get()
            .map_err(|e| StartupError::Database(format!("pool get failed: {e}")))?;
        leads::validate_schema(&conn)?;
    }

    let hmac = Arc::new(HmacVerifier::new(
        cfg.hmac_keys.clone(),
        cfg.hmac_max_skew_secs,
    ));
    let limiter = Arc::new(RateLimiter::new(cfg.rate_limit_per_key));

    let search_state = Arc::new(SearchState {
        service: Arc::new(SearchService::with_repo(
            contacts_pool.clone(),
            cfg.max_limit,
            Arc::new(SqliteSearchRepository),
        )),
        hmac: hmac.clone(),
        limiter: limiter.clone(),
    });
    let record_state = Arc::new(RecordState {
        service: Arc::new(CandidateService::with_repo(
            leads_pool.clone(),
            cfg.max_limit,
            Arc::new(SqliteLeadsRepository),
        )),
        import_service: Arc::new(ImportService::with_repo(
            leads_pool.clone(),
            Arc::new(SqliteLeadsRepository),
        )),
        hmac,
        limiter,
    });

    let health_pool = contacts_pool.clone();
    let app = Router::new()
        .route(
            "/v1/health",
            get(move || health::handler(health_pool.clone())),
        )
        .merge(search_router(search_state))
        .merge(record_router(record_state));

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

fn load_root_env() {
    let env_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../.env");
    let _ = dotenvy::from_path(env_path);
}
