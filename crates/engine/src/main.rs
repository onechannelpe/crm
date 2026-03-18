use axum::routing::get;
use axum::Router;
use engine::config::EngineConfig;
use engine::health::health_handler;
use engine::logging;
use leads::api::{router as lead_router, LeadState};
use leads::repo::SqliteLeadsRepository;
use leads::service::{CandidateService, ImportService};
use search::api::{router as search_router, SearchState};
use search::repo::SqliteSearchRepository;
use search::service::SearchService;
use shared::error::StartupError;
use shared::hmac::HmacVerifier;
use shared::rate_limit::RateLimiter;
use shared::sqlite::{make_pool, make_readonly_pool};
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
        eprintln!("error: {e}");
        std::process::exit(1);
    }
}

async fn run() -> Result<(), StartupError> {
    logging::init();
    load_root_env();

    let cfg = EngineConfig::load()?;

    // contacts.sqlite is pipeline-owned; fail fast with an actionable message.
    if !Path::new(&cfg.contacts_db_path).exists() {
        return Err(StartupError::Database(format!(
            "contacts database not found at {}\n  \
            Refresh it with: bun run pipeline:refresh",
            cfg.contacts_db_path
        )));
    }

    let contacts_pool = make_readonly_pool(&cfg.contacts_db_path)?;
    let leads_pool = make_pool(&cfg.leads_db_path)?;

    // Validate schemas eagerly — better to crash at startup than at first request.
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
    let lead_state = Arc::new(LeadState {
        service: Arc::new(CandidateService::with_repo(
            leads_pool.clone(),
            cfg.max_limit,
            Arc::new(SqliteLeadsRepository),
        )),
        import_service: Arc::new(ImportService::with_repo(
            leads_pool.clone(),
            Arc::new(SqliteLeadsRepository),
        )),
        hmac: hmac.clone(),
        limiter: limiter.clone(),
    });

    let health_pool = contacts_pool.clone();
    let app = Router::new()
        .route(
            "/v1/health",
            get(move || health_handler(health_pool.clone())),
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
