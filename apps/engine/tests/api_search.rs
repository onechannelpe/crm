mod common;

use axum_test::TestServer;
use crm_engine::api::router;
use crm_engine::domain::search_service::SearchService;
use crm_engine::security::hmac::HmacVerifier;
use crm_engine::security::rate_limit::RateLimiter;
use crm_engine::state::AppState;
use crm_engine::storage::sqlite::connection;
use crm_engine::storage::sqlite::schema_guard;
use serde_json::json;
use std::sync::Arc;

fn make_server(rate_limit_per_ip: u32) -> (TestServer, String) {
    let secret = "test-secret".to_string();
    let db = common::create_test_db();
    let pool = connection::make_pool(db.path().to_str().expect("path")).expect("pool");
    let conn = pool.get().expect("conn");
    schema_guard::validate(&conn).expect("schema");

    let state = AppState {
        search: Arc::new(SearchService::new(pool, 100)),
        hmac: Arc::new(HmacVerifier::new(secret.clone(), 60)),
        limiter: Arc::new(RateLimiter::new(rate_limit_per_ip)),
    };
    let app = router::build_router(state);
    // keep db alive by leaking it for test lifetime
    std::mem::forget(db);
    (TestServer::new(app).expect("server"), secret)
}

#[tokio::test]
async fn search_phone_enriched_returns_siblings() {
    let (server, secret) = make_server(100);
    let body = json!({"type":"phone_enriched","value":"999111222","limit":20});
    let bytes = serde_json::to_vec(&body).expect("json");
    let (ts, sig) = common::sign(&secret, &bytes);

    let response = server
        .post("/v1/search")
        .add_header("x-timestamp", ts)
        .add_header("x-signature", sig)
        .json(&body)
        .await;

    response.assert_status_ok();
    let payload = response.json::<serde_json::Value>();
    assert_eq!(payload["count"], 1);
    assert_eq!(payload["results"][0]["person"]["dni"], "12345678");
    assert_eq!(payload["results"][0]["org"]["name"], "ACME SAC");
    assert_eq!(payload["results"][0]["role"]["name"], "GERENTE GENERAL");
    assert!(
        payload["results"][0]["phones"]["siblings"]
            .as_array()
            .is_some()
    );
}

#[tokio::test]
async fn rejects_missing_signature() {
    let (server, _) = make_server(100);
    let body = json!({"type":"dni","value":"12345678","limit":20});

    let response = server.post("/v1/search").json(&body).await;
    response.assert_status_unauthorized();
}

#[tokio::test]
async fn rate_limit_is_enforced() {
    let (server, secret) = make_server(1);
    let body = json!({"type":"dni","value":"12345678","limit":20});

    let bytes = serde_json::to_vec(&body).expect("json");
    let (ts1, sig1) = common::sign(&secret, &bytes);
    let first = server
        .post("/v1/search")
        .add_header("x-timestamp", ts1)
        .add_header("x-signature", sig1)
        .json(&body)
        .await;
    first.assert_status_ok();

    let (ts2, sig2) = common::sign(&secret, &bytes);
    let second = server
        .post("/v1/search")
        .add_header("x-timestamp", ts2)
        .add_header("x-signature", sig2)
        .json(&body)
        .await;
    second.assert_status_too_many_requests();
}
