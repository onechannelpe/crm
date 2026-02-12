use axum_test::{TestServer, http::StatusCode};
use one_lookup::{
    api::{create_router, state::AppState},
    config::{ApiKeyEntry, Config},
    middleware::user::Role,
    service::LeadService,
};
use serde_json::Value;
use std::sync::Arc;

async fn setup_test_server(daily_quota: u32) -> TestServer {
    let test_data_path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/test_data.csv");

    let service = LeadService::new(test_data_path, daily_quota)
        .await
        .expect("failed to load test data");

    let api_keys = vec![
        (
            "exec_test_key".to_string(),
            ApiKeyEntry {
                user_id: 1001,
                role: Role::Executive,
            },
        ),
        (
            "super_test_key".to_string(),
            ApiKeyEntry {
                user_id: 2001,
                role: Role::Supervisor,
            },
        ),
    ];

    let config = Config::new(test_data_path.to_string(), api_keys, 60, daily_quota);

    let state = Arc::new(AppState::new(
        service,
        config.api_keys,
        config.rate_limit_per_minute,
    ));

    let router = create_router(state);
    TestServer::new(router).expect("failed to create test server")
}

#[tokio::test]
async fn search_by_dni_returns_correct_contact() {
    let server = setup_test_server(100).await;

    let response = server
        .get("/search/dni/12345678")
        .add_header("x-api-key", "exec_test_key")
        .await;

    response.assert_status_ok();

    let body: Value = response.json();
    let results = body["results"].as_array().unwrap();
    assert_eq!(results.len(), 1, "should find exactly one contact");

    let contact = &results[0];
    assert_eq!(contact["dni"].as_str().unwrap(), "12345678");
    assert_eq!(contact["name"].as_str().unwrap(), "Juan Perez");
    assert_eq!(contact["phone_primary"].as_str().unwrap(), "987654321");
}

#[tokio::test]
async fn search_by_dni_decrements_quota() {
    let server = setup_test_server(100).await;

    let quota_before = server
        .get("/quota/1001")
        .add_header("x-api-key", "super_test_key")
        .await;

    let before_body: Value = quota_before.json();
    let remaining_before = before_body["remaining"].as_u64().unwrap();

    server
        .get("/search/dni/12345678")
        .add_header("x-api-key", "exec_test_key")
        .await;

    let quota_after = server
        .get("/quota/1001")
        .add_header("x-api-key", "super_test_key")
        .await;

    let after_body: Value = quota_after.json();
    let remaining_after = after_body["remaining"].as_u64().unwrap();

    assert_eq!(
        remaining_after,
        remaining_before - 1,
        "quota should decrement by 1"
    );
}

#[tokio::test]
async fn search_by_ruc_returns_correct_organization() {
    let server = setup_test_server(100).await;

    let response = server
        .get("/search/ruc/20123456789")
        .add_header("x-api-key", "exec_test_key")
        .await;

    response.assert_status_ok();

    let body: Value = response.json();
    let results = body["results"].as_array().unwrap();
    assert!(
        !results.is_empty(),
        "should find at least one contact with this RUC"
    );

    let contact = &results[0];
    assert_eq!(contact["org_ruc"].as_str().unwrap(), "20123456789");
    assert_eq!(contact["org_name"].as_str().unwrap(), "Tech SAC");
}

#[tokio::test]
async fn search_by_phone_returns_correct_contact() {
    let server = setup_test_server(100).await;

    let response = server
        .get("/search/phone/987654321")
        .add_header("x-api-key", "exec_test_key")
        .await;

    response.assert_status_ok();

    let body: Value = response.json();
    let results = body["results"].as_array().unwrap();
    assert!(
        !results.is_empty(),
        "should find at least one contact with this phone"
    );

    let contact = &results[0];
    assert_eq!(contact["phone_primary"].as_str().unwrap(), "987654321");
    assert_eq!(contact["name"].as_str().unwrap(), "Juan Perez");
}

#[tokio::test]
async fn search_by_name_returns_multiple_results() {
    let server = setup_test_server(100).await;

    let response = server
        .get("/search/name?q=Garcia")
        .add_header("x-api-key", "exec_test_key")
        .await;

    response.assert_status_ok();

    let body: Value = response.json();
    let results = body["results"].as_array().unwrap();

    assert!(results.len() >= 5, "should find multiple Garcia contacts");

    for result in results {
        let name = result["name"].as_str().unwrap();
        assert!(name.contains("Garcia"), "all results should contain Garcia");
    }
}

#[tokio::test]
async fn search_by_name_respects_pagination_limit() {
    let server = setup_test_server(100).await;

    let response = server
        .get("/search/name?q=Garcia&limit=3")
        .add_header("x-api-key", "exec_test_key")
        .await;

    response.assert_status_ok();

    let body: Value = response.json();
    let results = body["results"].as_array().unwrap();

    assert!(results.len() <= 3, "should respect limit parameter");
}

#[tokio::test]
async fn quota_exhaustion_returns_429() {
    let server = setup_test_server(5).await;

    for i in 0..5 {
        let response = server
            .get(&format!("/search/dni/1234567{}", i))
            .add_header("x-api-key", "exec_test_key")
            .await;

        response.assert_status_ok();
    }

    let exhausted_response = server
        .get("/search/dni/12345678")
        .add_header("x-api-key", "exec_test_key")
        .await;

    exhausted_response.assert_status(StatusCode::TOO_MANY_REQUESTS);
}

#[tokio::test]
async fn quota_exhaustion_does_not_panic() {
    let server = setup_test_server(3).await;

    for _ in 0..3 {
        server
            .get("/search/dni/12345678")
            .add_header("x-api-key", "exec_test_key")
            .await;
    }

    let response = server
        .get("/search/dni/12345678")
        .add_header("x-api-key", "exec_test_key")
        .await;

    assert_eq!(response.status_code(), 429);

    let body: Value = response.json();
    assert!(
        body["error"].as_str().is_some(),
        "should return error message"
    );
}

#[tokio::test]
async fn search_nonexistent_dni_returns_empty_results() {
    let server = setup_test_server(100).await;

    let response = server
        .get("/search/dni/99999999")
        .add_header("x-api-key", "exec_test_key")
        .await;

    response.assert_status_ok();

    let body: Value = response.json();
    let results = body["results"].as_array().unwrap();
    assert_eq!(
        results.len(),
        0,
        "should return empty results for nonexistent DNI"
    );
}

#[tokio::test]
async fn search_creates_audit_log_entry() {
    let server = setup_test_server(100).await;

    server
        .get("/search/dni/12345678")
        .add_header("x-api-key", "exec_test_key")
        .await;

    let audit_response = server
        .get("/audit/1001")
        .add_header("x-api-key", "super_test_key")
        .await;

    audit_response.assert_status_ok();

    let body: Value = audit_response.json();
    let searches = body["searches"].as_array().unwrap();

    assert!(!searches.is_empty(), "should have audit log entries");

    let has_dni_search = searches
        .iter()
        .any(|log| log["search_type"].as_str().unwrap() == "dni");

    assert!(has_dni_search, "should log the DNI search");
}

#[tokio::test]
async fn supervisor_can_set_user_quota() {
    let server = setup_test_server(100).await;

    let response = server
        .post("/quota/1001")
        .add_header("x-api-key", "super_test_key")
        .json(&serde_json::json!({
            "daily_limit": 200
        }))
        .await;

    response.assert_status_ok();

    let quota_response = server
        .get("/quota/1001")
        .add_header("x-api-key", "super_test_key")
        .await;

    let body: Value = quota_response.json();
    assert_eq!(body["limit"].as_u64().unwrap(), 200);
}

#[tokio::test]
async fn empty_search_results_handled_gracefully() {
    let server = setup_test_server(100).await;

    let response = server
        .get("/search/name?q=ZzzNonexistentName")
        .add_header("x-api-key", "exec_test_key")
        .await;

    response.assert_status_ok();

    let body: Value = response.json();
    let results = body["results"].as_array().unwrap();

    assert_eq!(results.len(), 0, "should return empty array for no matches");
}
