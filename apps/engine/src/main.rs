use crm_engine::api::router;
use crm_engine::config::Config;
use crm_engine::domain::search_service::SearchService;
use crm_engine::errors::StartupError;
use crm_engine::observability::logging;
use crm_engine::security::hmac::HmacVerifier;
use crm_engine::security::rate_limit::RateLimiter;
use crm_engine::state::AppState;
use crm_engine::storage::sqlite::connection;
use crm_engine::storage::sqlite::schema_guard;
use std::path::Path;
use std::sync::Arc;

fn load_root_env() {
    let env_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../.env");
    let _ = dotenvy::from_path(env_path);
}

#[tokio::main]
async fn main() -> Result<(), StartupError> {
    logging::init();
    load_root_env();

    let cfg = Config::load()?;
    let pool = connection::make_pool(&cfg.db_path)?;

    {
        let conn = pool
            .get()
            .map_err(|e| StartupError::Database(format!("pool get failed: {e}")))?;
        schema_guard::validate(&conn)?;
    }

    let state = AppState {
        search: Arc::new(SearchService::new(pool.clone(), cfg.max_limit)),
        hmac: Arc::new(HmacVerifier::new(
            cfg.hmac_keys.clone(),
            cfg.hmac_max_skew_secs,
        )),
        limiter: Arc::new(RateLimiter::new(cfg.rate_limit_per_key)),
    };

    let app = router::build_router(state);
    let bind = format!("{}:{}", cfg.host, cfg.port);
    let listener = tokio::net::TcpListener::bind(&bind)
        .await
        .map_err(|e| StartupError::Config(format!("bind failed: {e}")))?;

    tracing::info!("engine listening on {bind}");
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .await
    .map_err(|e| StartupError::Config(format!("server error: {e}")))
}
