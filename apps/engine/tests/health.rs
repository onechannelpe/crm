use axum_test::TestServer;
use crm_engine::api::router;
use crm_engine::domain::search_service::SearchService;
use crm_engine::security::hmac::HmacVerifier;
use crm_engine::security::rate_limit::RateLimiter;
use crm_engine::state::AppState;
use crm_engine::storage::sqlite::connection;
use crm_engine::storage::sqlite::schema_guard;
use std::collections::HashMap;
use std::sync::Arc;

mod common;

#[tokio::test]
async fn health_ok() {
    let db = common::create_test_db();
    let pool = connection::make_pool(db.path().to_str().expect("path")).expect("pool");
    let conn = pool.get().expect("conn");
    schema_guard::validate(&conn).expect("schema");

    let app = router::build_router(AppState {
        search: Arc::new(SearchService::new(pool, 100)),
        hmac: Arc::new(HmacVerifier::new(
            HashMap::from([("web".to_string(), "x".to_string())]),
            60,
        )),
        limiter: Arc::new(RateLimiter::new(100)),
    });

    let server = TestServer::new(app).expect("server");
    let response = server.get("/v1/health").await;
    response.assert_status_ok();
    let payload = response.json::<serde_json::Value>();
    assert_eq!(payload["status"], "ok");
}
