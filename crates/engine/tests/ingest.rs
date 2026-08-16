use axum::body::Bytes;
use axum_test::{TestResponse, TestServer};
use engine::ingest::job::JobStore;
use engine::ingest::queue::{IngestQueue, run_consumer_loop};
use engine::ingest::runner::RunSettings;
use engine::ingest::upload::UploadRegistry;
use engine::ingest::{IngestState, router};
use pipeline::config::embedded;
use pipeline::storage::db::open_rw;
use pipeline::storage::schema::init_schema;
use sha2::{Digest, Sha256};
use shared::hmac::{HmacVerifier, sign};
use shared::rate_limit::RateLimiter;
use shared::sqlite::make_pool;
use std::collections::{BTreeSet, HashMap};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const SECRET: &str = "test-secret";
const KEY_ID: &str = "web";
const DEFAULT_MAX_UPLOAD_BYTES: u64 = 2 * 1024 * 1024 * 1024;
const DEFAULT_MAX_ROWS: i64 = 10_000_000;
const DEFAULT_MAX_QUEUED_UPLOADS: usize = 8;

struct Harness {
    server: TestServer,
    contacts_db_path: String,
    _dir: tempfile::TempDir,
}

fn harness() -> Harness {
    harness_with_limits(
        DEFAULT_MAX_UPLOAD_BYTES,
        DEFAULT_MAX_ROWS,
        DEFAULT_MAX_QUEUED_UPLOADS,
    )
}

fn harness_with_limits(max_upload_bytes: u64, max_rows: i64, max_queued_uploads: usize) -> Harness {
    let dir = tempfile::tempdir().expect("tempdir");

    let contacts_db_path = dir
        .path()
        .join("contacts.sqlite")
        .to_string_lossy()
        .into_owned();

    init_schema(&contacts_db_path).expect("init contacts schema");

    let upload_dir = dir.path().join("uploads");
    std::fs::create_dir(&upload_dir).expect("create upload dir");

    let job_db_path = dir
        .path()
        .join("ingest.sqlite")
        .to_string_lossy()
        .into_owned();

    let store = JobStore::new(make_pool(&job_db_path).expect("job pool")).expect("job store");

    let hmac = Arc::new(HmacVerifier::new(
        HashMap::from([(KEY_ID.to_owned(), SECRET.to_owned())]),
        60,
    ));

    let limiter = Arc::new(RateLimiter::new(100_000));

    let registry = UploadRegistry::new(max_queued_uploads);
    let (queue, receiver) = IngestQueue::new();

    tokio::spawn(run_consumer_loop(receiver, store.clone()));

    let state = Arc::new(IngestState::new(
        store,
        contacts_db_path.clone(),
        upload_dir,
        registry,
        queue,
        max_upload_bytes,
        RunSettings {
            workers: 2,
            batch_size: 100,
            max_rows,
        },
        hmac,
        limiter,
    ));

    Harness {
        server: TestServer::new(router(state)),
        contacts_db_path,
        _dir: dir,
    }
}

impl Harness {
    async fn register(&self, body: serde_json::Value) -> TestResponse {
        let raw = serde_json::to_string(&body).expect("serialize");

        self.signed_json_request(self.server.post("/ingest-uploads"), &raw)
            .await
    }

    async fn register_upload_id(
        &self,
        source_key: &str,
        snapshot_label: &str,
        contents: &str,
    ) -> String {
        let response = self
            .register(manifest(source_key, snapshot_label, contents))
            .await;

        response.assert_status(axum::http::StatusCode::ACCEPTED);

        response.json::<serde_json::Value>()["upload_id"]
            .as_str()
            .expect("upload_id")
            .to_owned()
    }

    async fn upload_blob(&self, upload_id: &str, contents: &str) -> TestResponse {
        let timestamp = now_secs();
        let signature = sign(SECRET, timestamp, upload_id.as_bytes()).expect("sign");

        self.server
            .put(&format!("/ingest-uploads/{upload_id}/blob"))
            .add_header("x-key-id", KEY_ID)
            .add_header("x-timestamp", timestamp.to_string())
            .add_header("x-signature", signature)
            .content_type("application/octet-stream")
            .bytes(Bytes::copy_from_slice(contents.as_bytes()))
            .await
    }

    /// Registers the upload, then sends the blob that creates the job.
    async fn register_and_upload(
        &self,
        source_key: &str,
        snapshot_label: &str,
        contents: &str,
    ) -> TestResponse {
        let upload_id = self
            .register_upload_id(source_key, snapshot_label, contents)
            .await;

        self.upload_blob(&upload_id, contents).await
    }

    async fn get_job(&self, job_id: &str) -> serde_json::Value {
        let response = self
            .signed_json_request(self.server.get(&format!("/ingest-jobs/{job_id}")), "")
            .await;

        response.assert_status_ok();

        response.json()
    }

    async fn signed_json_request(
        &self,
        request: axum_test::TestRequest,
        body: &str,
    ) -> TestResponse {
        let timestamp = now_secs();
        let signature = sign(SECRET, timestamp, body.as_bytes()).expect("sign");

        request
            .add_header("x-key-id", KEY_ID)
            .add_header("x-timestamp", timestamp.to_string())
            .add_header("x-signature", signature)
            .content_type("application/json")
            .text(body.to_owned())
            .await
    }

    /// Jobs run on a blocking thread, so poll until the outcome changes.
    async fn await_outcome(&self, job_id: &str) -> serde_json::Value {
        for _ in 0..200 {
            let job = self.get_job(job_id).await;

            if job["outcome"] != "running" {
                return job;
            }

            tokio::time::sleep(Duration::from_millis(25)).await;
        }

        panic!("ingest job {job_id} never finished");
    }

    fn projected_person_ruc(&self, dni: &str) -> Option<String> {
        let conn = open_rw(&self.contacts_db_path).expect("open contacts");

        conn.query_row(
            "SELECT person_ruc FROM doc_projection WHERE doc_type='DNI' AND doc_number=?1",
            [dni],
            |row| row.get::<_, Option<String>>(0),
        )
        .ok()
        .flatten()
    }

    fn projected_row_count(&self) -> i64 {
        let conn = open_rw(&self.contacts_db_path).expect("open contacts");

        conn.query_row("SELECT COUNT(*) FROM doc_projection", [], |row| row.get(0))
            .expect("count")
    }
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock")
        .as_secs()
}

fn manifest(source_key: &str, snapshot_label: &str, contents: &str) -> serde_json::Value {
    let bytes = contents.as_bytes();
    let sha256 = hex::encode(Sha256::digest(bytes));

    serde_json::json!({
        "source_key": source_key,
        "snapshot_label": snapshot_label,
        "snapshot_date": "2026-08-13",
        "size_bytes": bytes.len(),
        "sha256": sha256,
    })
}

const SUNAT_HEADER: &str = "doc,tipo_doc,num_doc,nombre,tipo_contribuyente";

#[tokio::test]
async fn ingests_a_sunat_scan_file_into_the_serving_projection() {
    let harness = harness();

    let contents = format!(
        "{SUNAT_HEADER}\n\
         10000013663,DNI,00001366,\"AGUIRRE BECERRA, ELOY\",PERSONA NATURAL CON NEGOCIO\n\
         10123456781,DNI,12345678,\"QUISPE ROJAS, MARIA\",PERSONA NATURAL CON NEGOCIO\n"
    );

    let response = harness
        .register_and_upload("osiptel_scan_sunat", "piura", &contents)
        .await;

    response.assert_status(axum::http::StatusCode::ACCEPTED);

    let job_id = response.json::<serde_json::Value>()["job_id"]
        .as_str()
        .expect("job_id")
        .to_owned();

    let job = harness.await_outcome(&job_id).await;

    assert_eq!(job["outcome"], "succeeded", "job: {job}");
    assert_eq!(job["step"], "complete");
    assert_eq!(job["total_rows"], 2);
    assert_eq!(job["accepted_rows"], 2);

    // RUC10 comes from `doc`; the CSV has no dedicated RUC column.
    assert_eq!(
        harness.projected_person_ruc("00001366").as_deref(),
        Some("10000013663")
    );
    assert_eq!(
        harness.projected_person_ruc("12345678").as_deref(),
        Some("10123456781")
    );
}

#[tokio::test]
async fn a_file_with_the_wrong_header_is_rejected_before_it_reaches_the_projection() {
    let harness = harness();
    let contents = "a,b,c\n10000013663,DNI,00001366\n10123456781,DNI,12345678\n";

    let response = harness
        .register_and_upload("osiptel_scan_sunat", "wrong", contents)
        .await;

    response.assert_status(axum::http::StatusCode::ACCEPTED);

    let job_id = response.json::<serde_json::Value>()["job_id"]
        .as_str()
        .expect("job_id")
        .to_owned();

    let job = harness.await_outcome(&job_id).await;

    assert_eq!(job["outcome"], "failed", "job: {job}");
    assert_eq!(job["step"], "gating");
    assert_eq!(job["accepted_rows"], 0);
    assert_eq!(job["gate"]["passed"], false);
    assert_eq!(
        harness.projected_row_count(),
        0,
        "a rejected file must not reach the serving tables"
    );
}

#[tokio::test]
async fn an_unknown_source_key_is_rejected_without_creating_a_job() {
    let harness = harness();

    let response = harness
        .register(manifest(
            "not_a_source",
            "piura",
            &format!("{SUNAT_HEADER}\n"),
        ))
        .await;

    response.assert_status_bad_request();

    let body = response.json::<serde_json::Value>();
    let message = body["error"].as_str().expect("error message");

    assert!(message.contains("not_a_source"), "message: {message}");
    assert!(message.contains("osiptel_scan_sunat"), "message: {message}");
}

#[tokio::test]
async fn a_checksum_mismatch_is_rejected_and_frees_the_queue_slot() {
    let harness = harness_with_limits(DEFAULT_MAX_UPLOAD_BYTES, DEFAULT_MAX_ROWS, 1);

    let contents = format!("{SUNAT_HEADER}\n");

    let register = harness
        .register(serde_json::json!({
            "source_key": "osiptel_scan_sunat",
            "snapshot_label": "piura",
            "snapshot_date": "2026-08-13",
            "size_bytes": contents.len(),
            "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        }))
        .await;

    register.assert_status(axum::http::StatusCode::ACCEPTED);

    let upload_id = register.json::<serde_json::Value>()["upload_id"]
        .as_str()
        .expect("upload_id")
        .to_owned();

    let response = harness.upload_blob(&upload_id, &contents).await;

    response.assert_status_bad_request();

    // The rejected upload must release its only queue slot.
    let retry = harness
        .register(manifest("osiptel_scan_sunat", "piura", &contents))
        .await;

    retry.assert_status(axum::http::StatusCode::ACCEPTED);
}

#[tokio::test]
async fn a_declared_size_over_the_limit_is_rejected_at_registration() {
    let harness = harness_with_limits(100, DEFAULT_MAX_ROWS, DEFAULT_MAX_QUEUED_UPLOADS);

    let response = harness
        .register(serde_json::json!({
            "source_key": "osiptel_scan_sunat",
            "snapshot_label": "piura",
            "snapshot_date": "2026-08-13",
            "size_bytes": 101,
            "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        }))
        .await;

    response.assert_status_bad_request();
}

#[tokio::test]
async fn actual_bytes_differing_from_the_declared_size_are_rejected() {
    let harness = harness();
    let declared = format!("{SUNAT_HEADER}\n");

    let upload_id = harness
        .register_upload_id("osiptel_scan_sunat", "piura", &declared)
        .await;

    let actual = format!(
        "{declared}10000013663,DNI,00001366,\"AGUIRRE BECERRA, ELOY\",PERSONA NATURAL CON NEGOCIO\n"
    );

    let response = harness.upload_blob(&upload_id, &actual).await;

    response.assert_status_bad_request();
}

#[tokio::test]
async fn a_row_count_over_the_limit_fails_the_job_during_staging() {
    let harness = harness_with_limits(DEFAULT_MAX_UPLOAD_BYTES, 1, DEFAULT_MAX_QUEUED_UPLOADS);

    let contents = format!(
        "{SUNAT_HEADER}\n\
         10000013663,DNI,00001366,\"AGUIRRE BECERRA, ELOY\",PERSONA NATURAL CON NEGOCIO\n\
         10123456781,DNI,12345678,\"QUISPE ROJAS, MARIA\",PERSONA NATURAL CON NEGOCIO\n"
    );

    let response = harness
        .register_and_upload("osiptel_scan_sunat", "piura", &contents)
        .await;

    response.assert_status(axum::http::StatusCode::ACCEPTED);

    let job_id = response.json::<serde_json::Value>()["job_id"]
        .as_str()
        .expect("job_id")
        .to_owned();

    let job = harness.await_outcome(&job_id).await;

    assert_eq!(job["outcome"], "failed", "job: {job}");
    assert_eq!(job["step"], "staging");

    let error = job["error"].as_str().expect("error message");

    assert!(error.contains("row count exceeds"), "error: {error}");
}

#[tokio::test]
async fn a_full_queue_is_rejected_with_service_unavailable() {
    let harness = harness_with_limits(DEFAULT_MAX_UPLOAD_BYTES, DEFAULT_MAX_ROWS, 1);

    let contents = format!("{SUNAT_HEADER}\n");

    let first = harness
        .register(manifest("osiptel_scan_sunat", "piura", &contents))
        .await;

    first.assert_status(axum::http::StatusCode::ACCEPTED);

    let second = harness
        .register(manifest("osiptel_scan_sunat", "lima", &contents))
        .await;

    second.assert_status(axum::http::StatusCode::SERVICE_UNAVAILABLE);
}

#[tokio::test]
async fn an_unsigned_register_request_is_rejected() {
    let harness = harness();

    let response = harness
        .server
        .post("/ingest-uploads")
        .json(&manifest(
            "osiptel_scan_sunat",
            "piura",
            &format!("{SUNAT_HEADER}\n"),
        ))
        .await;

    response.assert_status_unauthorized();
}

#[tokio::test]
async fn an_unsigned_blob_request_is_rejected() {
    let harness = harness();
    let contents = format!("{SUNAT_HEADER}\n");

    let upload_id = harness
        .register_upload_id("osiptel_scan_sunat", "piura", &contents)
        .await;

    let response = harness
        .server
        .put(&format!("/ingest-uploads/{upload_id}/blob"))
        .content_type("application/octet-stream")
        .bytes(Bytes::copy_from_slice(contents.as_bytes()))
        .await;

    response.assert_status_unauthorized();
}

#[tokio::test]
async fn reading_an_unknown_job_returns_not_found() {
    let harness = harness();

    let response = harness
        .signed_json_request(harness.server.get("/ingest-jobs/does-not-exist"), "")
        .await;

    response.assert_status_not_found();
}

#[tokio::test]
async fn listing_sources_returns_every_embedded_mapping() {
    let harness = harness();

    let response = harness
        .signed_json_request(harness.server.get("/ingest-sources"), "")
        .await;

    response.assert_status_ok();

    let body: serde_json::Value = response.json();

    let returned_keys: BTreeSet<String> = body["sources"]
        .as_array()
        .expect("sources array")
        .iter()
        .map(|source| {
            source["source_key"]
                .as_str()
                .expect("source_key")
                .to_owned()
        })
        .collect();

    let embedded_keys: BTreeSet<String> = embedded::source_keys().map(str::to_owned).collect();

    assert_eq!(returned_keys, embedded_keys);
}

#[test]
fn the_new_source_is_in_the_embedded_registry() {
    assert!(embedded::source_keys().any(|key| key == "osiptel_scan_sunat"));
}
