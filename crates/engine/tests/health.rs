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
    // No auth headers, should return 401 not 404, confirms the route is wired.
    let response = server
        .post("/v1/search")
        .json(&serde_json::json!({"type":"dni","value":"12345678"}))
        .await;
    response.assert_status_unauthorized();
}

#[tokio::test]
async fn unauthorized_errors_include_request_id_header_and_body() {
    let (server, _db) = common::make_test_server();
    let response = server
        .post("/v1/search")
        .json(&serde_json::json!({"type":"dni","value":"12345678"}))
        .await;

    response.assert_status_unauthorized();
    assert!(response.contains_header("x-request-id"));

    let header_value = response
        .header("x-request-id")
        .to_str()
        .expect("x-request-id must be valid header string")
        .to_string();

    let payload = response.json::<serde_json::Value>();
    assert_eq!(payload["request_id"], header_value);
}

#[tokio::test]
async fn record_candidates_endpoint_exists_and_requires_auth() {
    let (server, _db) = common::make_test_server();
    let response = server
        .post("/v1/records/candidates")
        .json(&serde_json::json!({"branch_id":1,"user_id":1}))
        .await;
    response.assert_status_unauthorized();
}

#[tokio::test]
async fn import_endpoint_exists_and_requires_auth() {
    let (server, _db) = common::make_test_server();
    let response = server
        .post("/v1/records/imports")
        .json(&serde_json::json!({"rows":[],"source":"test"}))
        .await;
    response.assert_status_unauthorized();
}
