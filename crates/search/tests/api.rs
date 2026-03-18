mod common;

use axum::http::{HeaderName, HeaderValue};
use axum_test::TestServer;
use search::api::{router, SearchState};
use search::service::SearchService;
use serde_json::json;
use shared::hmac::HmacVerifier;
use shared::rate_limit::RateLimiter;
use std::collections::HashMap;
use std::sync::Arc;

const KEY_ID: &str = "web";
const SECRET: &str = "test-secret";

fn make_server(tokens_per_minute: u32) -> TestServer {
    let db = common::create_test_db();
    let pool = common::test_pool(&db);
    let conn = pool.get().expect("conn");
    search::validate_schema(&conn).expect("schema");

    let state = Arc::new(SearchState {
        service: Arc::new(SearchService::new(pool, 100)),
        hmac: Arc::new(HmacVerifier::new(
            HashMap::from([(KEY_ID.to_string(), SECRET.to_string())]),
            60,
        )),
        limiter: Arc::new(RateLimiter::new(tokens_per_minute)),
    });

    std::mem::forget(db);
    TestServer::new(router(state))
}

/// Signs `body`, sends POST /v1/search, and returns the response.
async fn signed_request(body: &serde_json::Value, server: &TestServer) -> axum_test::TestResponse {
    let bytes = serde_json::to_vec(body).expect("json");
    let (ts, sig) = common::sign(SECRET, &bytes);

    server
        .post("/v1/search")
        .add_header(
            HeaderName::from_static("x-key-id"),
            HeaderValue::from_static(KEY_ID),
        )
        .add_header(
            HeaderName::from_static("x-timestamp"),
            HeaderValue::from_str(&ts).expect("ts header"),
        )
        .add_header(
            HeaderName::from_static("x-signature"),
            HeaderValue::from_str(&sig).expect("sig header"),
        )
        .json(body)
        .await
}

// ── happy paths ───────────────────────────────────────────────────────────────

#[tokio::test]
async fn search_by_dni_returns_matching_row() {
    let server = make_server(100);
    let response =
        signed_request(&json!({"type":"dni","value":"12345678","limit":5}), &server).await;

    response.assert_status_ok();
    let payload = response.json::<serde_json::Value>();
    assert_eq!(payload["count"], 1);
    assert_eq!(payload["results"][0]["person"]["dni"], "12345678");
}

#[tokio::test]
async fn search_by_phone_enriched_returns_siblings() {
    let server = make_server(100);
    let response = signed_request(
        &json!({"type":"phone_enriched","value":"999111222","limit":20}),
        &server,
    )
    .await;

    response.assert_status_ok();
    let payload = response.json::<serde_json::Value>();
    assert_eq!(payload["count"], 1);
    assert_eq!(payload["results"][0]["person"]["dni"], "12345678");
    assert_eq!(payload["results"][0]["org"]["name"], "ACME SAC");
    assert_eq!(payload["results"][0]["role"]["name"], "GERENTE GENERAL");
    assert!(payload["results"][0]["phones"]["siblings"]
        .as_array()
        .is_some());
}

// ── auth / validation ─────────────────────────────────────────────────────────

#[tokio::test]
async fn missing_signature_headers_returns_401() {
    let server = make_server(100);
    let response = server
        .post("/v1/search")
        .json(&json!({"type":"dni","value":"12345678"}))
        .await;
    response.assert_status_unauthorized();
}

#[tokio::test]
async fn unknown_key_id_returns_401() {
    let server = make_server(100);
    let body = json!({"type":"dni","value":"12345678","limit":5});
    let bytes = serde_json::to_vec(&body).expect("json");
    let (ts, sig) = common::sign(SECRET, &bytes);

    server
        .post("/v1/search")
        .add_header(
            HeaderName::from_static("x-key-id"),
            HeaderValue::from_static("unknown"),
        )
        .add_header(
            HeaderName::from_static("x-timestamp"),
            HeaderValue::from_str(&ts).expect("ts header"),
        )
        .add_header(
            HeaderName::from_static("x-signature"),
            HeaderValue::from_str(&sig).expect("sig header"),
        )
        .json(&body)
        .await
        .assert_status_unauthorized();
}

#[tokio::test]
async fn short_text_query_returns_400() {
    let server = make_server(100);
    let response = signed_request(
        &json!({"type":"person_name","value":"ro","limit":20}),
        &server,
    )
    .await;
    response.assert_status_bad_request();
}

// ── rate limiting ─────────────────────────────────────────────────────────────

#[tokio::test]
async fn rate_limit_is_enforced_after_capacity_exhausted() {
    // 1 token — DNI costs 1, so the second call must be rejected.
    let server = make_server(1);
    let body = json!({"type":"dni","value":"12345678","limit":5});

    signed_request(&body, &server).await.assert_status_ok();
    signed_request(&body, &server)
        .await
        .assert_status_too_many_requests();
}

#[tokio::test]
async fn name_search_costs_more_tokens_than_dni() {
    // 3 tokens — person_name costs 3, so the second call must be rejected.
    let server = make_server(3);
    let body = json!({"type":"person_name","value":"juan","limit":20});

    signed_request(&body, &server).await.assert_status_ok();
    signed_request(&body, &server)
        .await
        .assert_status_too_many_requests();
}
