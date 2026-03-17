mod common;

use axum_test::TestServer;
use engine_infra::hmac::HmacVerifier;
use engine_infra::rate_limit::RateLimiter;
use search_service::api::{SearchState, router};
use search_service::service::SearchService;
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;

const TEST_KEY_ID: &str = "web";

fn make_server(rate_limit_per_key: u32) -> (TestServer, String) {
    let secret = "test-secret".to_string();
    let db = common::create_test_db();
    let pool = common::test_pool(&db);
    let conn = pool.get().expect("conn");
    search_service::schema_guard::validate(&conn).expect("schema");

    let state = Arc::new(SearchState {
        service: Arc::new(SearchService::new(pool, 100)),
        hmac: Arc::new(HmacVerifier::new(
            HashMap::from([(TEST_KEY_ID.to_string(), secret.clone())]),
            60,
        )),
        limiter: Arc::new(RateLimiter::new(rate_limit_per_key)),
    });
    let app = router(state);
    std::mem::forget(db);
    (TestServer::new(app).expect("server"), secret)
}

#[tokio::test]
async fn phone_enriched_returns_siblings() {
    let (server, secret) = make_server(100);
    let body = json!({"type":"phone_enriched","value":"999111222","limit":20});
    let bytes = serde_json::to_vec(&body).expect("json");
    let (ts, sig) = common::sign(&secret, &bytes);

    let response = server
        .post("/v1/search")
        .add_header("x-key-id", TEST_KEY_ID)
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
    server
        .post("/v1/search")
        .add_header("x-key-id", TEST_KEY_ID)
        .add_header("x-timestamp", ts1)
        .add_header("x-signature", sig1)
        .json(&body)
        .await
        .assert_status_ok();

    let (ts2, sig2) = common::sign(&secret, &bytes);
    server
        .post("/v1/search")
        .add_header("x-key-id", TEST_KEY_ID)
        .add_header("x-timestamp", ts2)
        .add_header("x-signature", sig2)
        .json(&body)
        .await
        .assert_status_too_many_requests();
}

#[tokio::test]
async fn rejects_short_token_name_query() {
    let (server, secret) = make_server(100);
    let body = json!({"type":"person_name","value":"ro","limit":20});
    let bytes = serde_json::to_vec(&body).expect("json");
    let (ts, sig) = common::sign(&secret, &bytes);

    server
        .post("/v1/search")
        .add_header("x-key-id", TEST_KEY_ID)
        .add_header("x-timestamp", ts)
        .add_header("x-signature", sig)
        .json(&body)
        .await
        .assert_status_bad_request();
}

#[tokio::test]
async fn rejects_unknown_key_id() {
    let (server, secret) = make_server(100);
    let body = json!({"type":"dni","value":"12345678","limit":20});
    let bytes = serde_json::to_vec(&body).expect("json");
    let (ts, sig) = common::sign(&secret, &bytes);

    server
        .post("/v1/search")
        .add_header("x-key-id", "unknown")
        .add_header("x-timestamp", ts)
        .add_header("x-signature", sig)
        .json(&body)
        .await
        .assert_status_unauthorized();
}

#[tokio::test]
async fn applies_weighted_cost_to_name_queries() {
    let (server, secret) = make_server(3);
    let body = json!({"type":"person_name","value":"juan","limit":20});
    let bytes = serde_json::to_vec(&body).expect("json");

    let (ts1, sig1) = common::sign(&secret, &bytes);
    server
        .post("/v1/search")
        .add_header("x-key-id", TEST_KEY_ID)
        .add_header("x-timestamp", ts1)
        .add_header("x-signature", sig1)
        .json(&body)
        .await
        .assert_status_ok();

    let (ts2, sig2) = common::sign(&secret, &bytes);
    server
        .post("/v1/search")
        .add_header("x-key-id", TEST_KEY_ID)
        .add_header("x-timestamp", ts2)
        .add_header("x-signature", sig2)
        .json(&body)
        .await
        .assert_status_too_many_requests();
}
