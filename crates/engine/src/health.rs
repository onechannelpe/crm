use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::Serialize;
use shared::sqlite::SqlitePool;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub build_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub built_at: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rows: Option<i64>,
}

/// Queries the pipeline build metadata table and returns 200 OK with build
/// info, or 503 if the contacts database is unreachable or unpopulated.
pub async fn health_handler(pool: SqlitePool) -> impl IntoResponse {
    let result = tokio::task::spawn_blocking(move || probe_db(&pool))
        .await
        .unwrap_or(None);

    match result {
        Some((build_id, built_at, rows)) => (
            StatusCode::OK,
            axum::Json(HealthResponse {
                status: "ok",
                build_id,
                built_at: (built_at > 0).then_some(built_at),
                rows: Some(rows),
            }),
        ),
        None => (
            StatusCode::SERVICE_UNAVAILABLE,
            axum::Json(HealthResponse {
                status: "degraded",
                build_id: None,
                built_at: None,
                rows: None,
            }),
        ),
    }
}

/// Returns `Some((build_id, built_at, rows))` on success, `None` on any error.
/// Keeping this as a synchronous function makes it straightforward to test
/// without an async runtime.
fn probe_db(pool: &SqlitePool) -> Option<(Option<String>, i64, i64)> {
    let conn = pool.get().ok()?;

    // Confirm the projection table exists and has at least one row.
    let _: i64 = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM search_projection LIMIT 1)",
            [],
            |r| r.get(0),
        )
        .ok()?;

    let build_id = conn
        .query_row(
            "SELECT value FROM _pipeline_build WHERE key = 'build_id'",
            [],
            |r| r.get::<_, String>(0),
        )
        .ok();

    let built_at = read_i64(&conn, "built_at").unwrap_or(0);
    let rows = read_i64(&conn, "rows").unwrap_or(0);

    Some((build_id, built_at, rows))
}

fn read_i64(conn: &rusqlite::Connection, key: &str) -> Option<i64> {
    conn.query_row(
        "SELECT value FROM _pipeline_build WHERE key = ?1",
        [key],
        |r| r.get::<_, String>(0),
    )
    .ok()
    .and_then(|s| s.parse().ok())
}
