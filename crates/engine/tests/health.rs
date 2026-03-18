mod common;

#[tokio::test]
async fn health_returns_ok_with_minimal_schema() {
    let (server, _db) = common::make_test_server();
    let response = server.get("/v1/health").await;
    response.assert_status_ok();
    let payload = response.json::<serde_json::Value>();
    assert_eq!(payload["status"], "ok");
}

#[tokio::test]
async fn search_endpoint_exists_and_requires_auth() {
    let (server, _db) = common::make_test_server();
    // No auth headers — should be 401, not 404. Confirms the route is wired.
    let response = server
        .post("/v1/search")
        .json(&serde_json::json!({"type":"dni","value":"12345678"}))
        .await;
    response.assert_status_unauthorized();
}

#[tokio::test]
async fn lead_candidates_endpoint_exists_and_requires_auth() {
    let (server, _db) = common::make_test_server();
    let response = server
        .post("/v1/lead-candidates")
        .json(&serde_json::json!({"branch_id":1,"user_id":1}))
        .await;
    response.assert_status_unauthorized();
}

#[tokio::test]
async fn import_endpoint_exists_and_requires_auth() {
    let (server, _db) = common::make_test_server();
    let response = server
        .post("/v1/leads/import")
        .json(&serde_json::json!({"rows":[],"source":"test"}))
        .await;
    response.assert_status_unauthorized();
}
