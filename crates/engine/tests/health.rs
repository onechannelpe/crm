use axum::Router;
use axum::routing::get;
use axum_test::TestServer;
use engine_infra::hmac::HmacVerifier;
use engine_infra::rate_limit::RateLimiter;
use engine_infra::sqlite::make_readonly_pool;
use lead_service::api::{LeadState, router as lead_router};
use lead_service::service::{CandidateService, ImportService};
use search_service::api::{SearchState, router as search_router};
use search_service::service::SearchService;
use std::collections::HashMap;
use std::sync::Arc;

mod common;

fn make_app() -> TestServer {
    let db = common::create_test_db();
    let pool = make_readonly_pool(db.path().to_str().expect("path")).expect("pool");
    let conn = pool.get().expect("conn");
    search_service::schema_guard::validate(&conn).expect("schema");

    let hmac = Arc::new(HmacVerifier::new(
        HashMap::from([("web".to_string(), "x".to_string())]),
        60,
    ));
    let limiter = Arc::new(RateLimiter::new(100));

    let search_state = Arc::new(SearchState {
        service: Arc::new(SearchService::new(pool.clone(), 100)),
        hmac: hmac.clone(),
        limiter: limiter.clone(),
    });

    // leads pool: reuse the same contacts pool for test (schema_guard skipped for leads in health test)
    let lead_state = Arc::new(LeadState {
        service: Arc::new(CandidateService::new(pool.clone(), 100)),
        import_service: Arc::new(ImportService::new(pool.clone())),
        hmac: hmac.clone(),
        limiter: limiter.clone(),
    });

    let app = Router::new()
        .route(
            "/v1/health",
            get(|| async { axum::Json(serde_json::json!({"status":"ok"})) }),
        )
        .merge(search_router(search_state))
        .merge(lead_router(lead_state));

    std::mem::forget(db);
    TestServer::new(app).expect("server")
}

#[tokio::test]
async fn health_returns_ok() {
    let server = make_app();
    let response = server.get("/v1/health").await;
    response.assert_status_ok();
    let payload = response.json::<serde_json::Value>();
    assert_eq!(payload["status"], "ok");
}
