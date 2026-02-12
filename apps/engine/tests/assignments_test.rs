use axum_test::TestServer;
use one_lookup::{
    api::{create_router, state::AppState},
    config::{ApiKeyEntry, Config},
    middleware::user::Role,
    service::LeadService,
};
use serde_json::Value;
use std::sync::Arc;

async fn setup_test_server() -> TestServer {
    let test_data_path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/test_data.csv");

    let service = LeadService::new(test_data_path, 100)
        .await
        .expect("failed to load test data");

    let api_keys = vec![
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
async fn assign_leads_returns_correct_count() {
    let server = setup_test_server().await;

    let response = server
        .post("/leads/assign")
        .add_header("x-api-key", "super_test_key")
        .json(&serde_json::json!({
            "lead_ids": [0, 1, 2, 3, 4],
            "assigned_to": 2001
        }))
        .await;

    response.assert_status_ok();

    let body: Value = response.json();
    assert_eq!(
        body["assigned"].as_u64().unwrap(),
        5,
        "should assign 5 leads"
    );
}

#[tokio::test]
async fn reassign_same_leads_returns_zero_count() {
    let server = setup_test_server().await;

    let first_response = server
        .post("/leads/assign")
        .add_header("x-api-key", "super_test_key")
        .json(&serde_json::json!({
            "lead_ids": [10, 11, 12, 13, 14],
            "assigned_to": 2001
        }))
        .await;

    first_response.assert_status_ok();
    let first_body: Value = first_response.json();
    assert_eq!(first_body["assigned"].as_u64().unwrap(), 5);

    let second_response = server
        .post("/leads/assign")
        .add_header("x-api-key", "super_test_key")
        .json(&serde_json::json!({
            "lead_ids": [10, 11, 12, 13, 14],
            "assigned_to": 2001
        }))
        .await;

    second_response.assert_status_ok();
    let second_body: Value = second_response.json();
    assert_eq!(
        second_body["assigned"].as_u64().unwrap(),
        0,
        "reassigning same leads should return 0 (dedup)"
    );
}

#[tokio::test]
async fn my_leads_shows_no_duplicates_after_reassignment() {
    let server = setup_test_server().await;

    server
        .post("/leads/assign")
        .add_header("x-api-key", "super_test_key")
        .json(&serde_json::json!({
            "lead_ids": [20, 21, 22],
            "assigned_to": 2001
        }))
        .await;

    server
        .post("/leads/assign")
        .add_header("x-api-key", "super_test_key")
        .json(&serde_json::json!({
            "lead_ids": [20, 21, 22],
            "assigned_to": 2001
        }))
        .await;

    let response = server
        .get("/leads/mine")
        .add_header("x-api-key", "super_test_key")
        .await;

    response.assert_status_ok();

    let body: Value = response.json();
    let leads = body["leads"].as_array().unwrap();

    assert_eq!(leads.len(), 3, "should have exactly 3 unique leads");
}

#[tokio::test]
async fn assign_to_different_users_succeeds() {
    let server = setup_test_server().await;

    let first_response = server
        .post("/leads/assign")
        .add_header("x-api-key", "super_test_key")
        .json(&serde_json::json!({
            "lead_ids": [30, 31],
            "assigned_to": 2001
        }))
        .await;

    first_response.assert_status_ok();
    let first_body: Value = first_response.json();
    assert_eq!(first_body["assigned"].as_u64().unwrap(), 2);

    let second_response = server
        .post("/leads/assign")
        .add_header("x-api-key", "admin_test_key")
        .json(&serde_json::json!({
            "lead_ids": [30, 31],
            "assigned_to": 3001
        }))
        .await;

    second_response.assert_status_ok();
    let second_body: Value = second_response.json();
    assert_eq!(
        second_body["assigned"].as_u64().unwrap(),
        2,
        "same leads can be assigned to different users"
    );
}

#[tokio::test]
async fn assign_with_invalid_lead_ids_returns_zero() {
    let server = setup_test_server().await;

    let response = server
        .post("/leads/assign")
        .add_header("x-api-key", "super_test_key")
        .json(&serde_json::json!({
            "lead_ids": [9999, 10000, 10001],
            "assigned_to": 2001
        }))
        .await;

    response.assert_status_ok();

    let body: Value = response.json();
    assert_eq!(
        body["assigned"].as_u64().unwrap(),
        0,
        "invalid lead IDs should result in 0 assignments"
    );
}

#[tokio::test]
async fn stats_shows_accurate_assignment_counts() {
    let server = setup_test_server().await;

    server
        .post("/leads/assign")
        .add_header("x-api-key", "super_test_key")
        .json(&serde_json::json!({
            "lead_ids": [40, 41, 42, 43],
            "assigned_to": 2001
        }))
        .await;

    let response = server
        .get("/stats")
        .add_header("x-api-key", "admin_test_key")
        .await;

    response.assert_status_ok();

    let body: Value = response.json();
    let assigned_contacts = body["assigned_contacts"].as_u64().unwrap();

    assert!(
        assigned_contacts >= 4,
        "stats should reflect assigned contacts"
    );
}

#[tokio::test]
async fn my_leads_returns_correct_contact_data() {
    let server = setup_test_server().await;

    server
        .post("/leads/assign")
        .add_header("x-api-key", "super_test_key")
        .json(&serde_json::json!({
            "lead_ids": [0],
            "assigned_to": 2001
        }))
        .await;

    let response = server
        .get("/leads/mine")
        .add_header("x-api-key", "super_test_key")
        .await;

    response.assert_status_ok();

    let body: Value = response.json();
    let leads = body["leads"].as_array().unwrap();

    assert!(!leads.is_empty(), "should have at least one lead");

    let first_lead = &leads[0];
    assert_eq!(first_lead["dni"].as_str().unwrap(), "12345678");
    assert_eq!(first_lead["name"].as_str().unwrap(), "Juan Perez");
}
