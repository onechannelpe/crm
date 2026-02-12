use axum_test::TestServer;
use one_lookup::{
    api::{create_router, state::AppState},
    config::{ApiKeyEntry, Config},
    middleware::user::Role,
    service::LeadService,
};
use std::sync::Arc;

async fn setup_test_server() -> TestServer {
    let test_data_path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/test_data.csv");

    let service = LeadService::new(test_data_path, 100)
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
        (
            "admin_test_key".to_string(),
            ApiKeyEntry {
                user_id: 3001,
                role: Role::Admin,
            },
        ),
    ];

    let config = Config::new(test_data_path.to_string(), api_keys, 60, 100);

    let state = Arc::new(AppState::new(
        service,
        config.api_keys,
        config.rate_limit_per_minute,
    ));

    let router = create_router(state);
    TestServer::new(router).expect("failed to create test server")
}

#[tokio::test]
async fn health_endpoint_works_without_auth() {
    let server = setup_test_server().await;

    let response = server.get("/health").await;

    response.assert_status_ok();
}

#[tokio::test]
async fn search_without_api_key_returns_401() {
    let server = setup_test_server().await;

    let response = server.get("/search/dni/12345678").await;

    response.assert_status_unauthorized();
}

#[tokio::test]
async fn search_with_invalid_api_key_returns_401() {
    let server = setup_test_server().await;

    let response = server
        .get("/search/dni/12345678")
        .add_header("x-api-key", "invalid_key_12345")
        .await;

    response.assert_status_unauthorized();
}

#[tokio::test]
async fn executive_can_access_search_endpoints() {
    let server = setup_test_server().await;

    let response = server
        .get("/search/dni/12345678")
        .add_header("x-api-key", "exec_test_key")
        .await;

    response.assert_status_ok();
}

#[tokio::test]
async fn executive_can_access_my_leads() {
    let server = setup_test_server().await;

    let response = server
        .get("/leads/mine")
        .add_header("x-api-key", "exec_test_key")
        .await;

    response.assert_status_ok();
}

#[tokio::test]
async fn executive_cannot_access_quota_endpoint() {
    let server = setup_test_server().await;

    let response = server
        .get("/quota/1001")
        .add_header("x-api-key", "exec_test_key")
        .await;

    response.assert_status_forbidden();
}

#[tokio::test]
async fn executive_cannot_access_audit_endpoint() {
    let server = setup_test_server().await;

    let response = server
        .get("/audit/1001")
        .add_header("x-api-key", "exec_test_key")
        .await;

    response.assert_status_forbidden();
}

#[tokio::test]
async fn executive_cannot_access_assign_endpoint() {
    let server = setup_test_server().await;

    let response = server
        .post("/leads/assign")
        .add_header("x-api-key", "exec_test_key")
        .json(&serde_json::json!({
            "lead_ids": [0, 1],
            "assigned_to": 1001
        }))
        .await;

    response.assert_status_forbidden();
}

#[tokio::test]
async fn supervisor_can_access_quota_endpoint() {
    let server = setup_test_server().await;

    let response = server
        .get("/quota/2001")
        .add_header("x-api-key", "super_test_key")
        .await;

    response.assert_status_ok();
}

#[tokio::test]
async fn supervisor_can_access_audit_endpoint() {
    let server = setup_test_server().await;

    let response = server
        .get("/audit/2001")
        .add_header("x-api-key", "super_test_key")
        .await;

    response.assert_status_ok();
}

#[tokio::test]
async fn supervisor_can_access_assign_endpoint() {
    let server = setup_test_server().await;

    let response = server
        .post("/leads/assign")
        .add_header("x-api-key", "super_test_key")
        .json(&serde_json::json!({
            "lead_ids": [0, 1],
            "assigned_to": 2001
        }))
        .await;

    response.assert_status_ok();
}

#[tokio::test]
async fn supervisor_cannot_access_stats_endpoint() {
    let server = setup_test_server().await;

    let response = server
        .get("/stats")
        .add_header("x-api-key", "super_test_key")
        .await;

    response.assert_status_forbidden();
}

#[tokio::test]
async fn admin_can_access_stats_endpoint() {
    let server = setup_test_server().await;

    let response = server
        .get("/stats")
        .add_header("x-api-key", "admin_test_key")
        .await;

    response.assert_status_ok();
}

#[tokio::test]
async fn admin_can_access_all_supervisor_endpoints() {
    let server = setup_test_server().await;

    let quota_response = server
        .get("/quota/3001")
        .add_header("x-api-key", "admin_test_key")
        .await;

    let audit_response = server
        .get("/audit/3001")
        .add_header("x-api-key", "admin_test_key")
        .await;

    let assign_response = server
        .post("/leads/assign")
        .add_header("x-api-key", "admin_test_key")
        .json(&serde_json::json!({
            "lead_ids": [0, 1],
            "assigned_to": 3001
        }))
        .await;

    quota_response.assert_status_ok();
    audit_response.assert_status_ok();
    assign_response.assert_status_ok();
}
