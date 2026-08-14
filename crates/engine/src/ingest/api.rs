use axum::Router;
use axum::body::Bytes;
use axum::extract::{Path as AxumPath, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post, put};
use shared::auth;
use shared::error::{ApiError, RequestError};
use shared::hmac::HmacVerifier;
use shared::rate_limit::RateLimiter;
use std::path::PathBuf;
use std::sync::Arc;
use uuid::Uuid;

use crate::ingest::contracts::{IngestJobResponse, IngestSource, ListIngestSourcesResponse};
use crate::ingest::job::JobStore;
use crate::ingest::queue::IngestQueue;
use crate::ingest::runner::RunSettings;
use crate::ingest::upload::{self, UploadRegistry};

pub struct IngestState {
    pub store: JobStore,
    pub contacts_db_path: String,
    /// Fixed, engine-owned scratch directory for in-flight uploads, not
    /// operator-configurable. See `runtime::build_ingest_router`.
    pub upload_dir: PathBuf,
    pub registry: UploadRegistry,
    pub queue: IngestQueue,
    pub max_upload_bytes: u64,
    pub settings: RunSettings,
    pub hmac: Arc<HmacVerifier>,
    pub limiter: Arc<RateLimiter>,
}

impl IngestState {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        store: JobStore,
        contacts_db_path: String,
        upload_dir: PathBuf,
        registry: UploadRegistry,
        queue: IngestQueue,
        max_upload_bytes: u64,
        settings: RunSettings,
        hmac: Arc<HmacVerifier>,
        limiter: Arc<RateLimiter>,
    ) -> Self {
        Self {
            store,
            contacts_db_path,
            upload_dir,
            registry,
            queue,
            max_upload_bytes,
            settings,
            hmac,
            limiter,
        }
    }
}

pub fn router(state: Arc<IngestState>) -> Router {
    Router::new()
        .route("/ingest-uploads", post(upload::handle_register_upload))
        .route(
            "/ingest-uploads/{upload_id}/blob",
            put(upload::handle_upload_blob),
        )
        .route("/ingest-jobs/{job_id}", get(handle_get_job))
        .route("/ingest-sources", get(handle_list_sources))
        .with_state(state)
}

async fn handle_list_sources(
    State(state): State<Arc<IngestState>>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Response, RequestError> {
    let request_id = Uuid::new_v4().to_string();

    let key_id = auth::verify_signed_request(&headers, &body, &state.hmac, &state.limiter)
        .map_err(|e| e.with_request_id(request_id.clone()))?;

    let limiter_key = format!("ingest_sources_read:{key_id}");
    if !state.limiter.allow(&limiter_key, 1) {
        return Err(ApiError::RateLimit.with_request_id(request_id));
    }

    let sources = pipeline::config::embedded::list_sources()
        .into_iter()
        .map(|(source_key, source_name)| IngestSource {
            source_key,
            source_name,
        })
        .collect();

    Ok(attach_request_id(
        (
            StatusCode::OK,
            axum::Json(ListIngestSourcesResponse { sources }),
        )
            .into_response(),
        &request_id,
    ))
}

async fn handle_get_job(
    State(state): State<Arc<IngestState>>,
    AxumPath(job_id): AxumPath<String>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Response, RequestError> {
    let request_id = Uuid::new_v4().to_string();

    let key_id = auth::verify_signed_request(&headers, &body, &state.hmac, &state.limiter)
        .map_err(|e| e.with_request_id(request_id.clone()))?;

    let limiter_key = format!("ingest_jobs_read:{key_id}");
    if !state.limiter.allow(&limiter_key, 1) {
        return Err(ApiError::RateLimit.with_request_id(request_id));
    }

    let record = state
        .store
        .get(&job_id)
        .map_err(|err| {
            tracing::error!(%job_id, %err, "could not read ingest job");
            ApiError::Internal.with_request_id(request_id.clone())
        })?
        .ok_or_else(|| {
            ApiError::NotFound(format!("no ingest job with id {job_id}"))
                .with_request_id(request_id.clone())
        })?;

    Ok(attach_request_id(
        (
            StatusCode::OK,
            axum::Json(IngestJobResponse { job: record }),
        )
            .into_response(),
        &request_id,
    ))
}

/// Shared with `upload`'s handlers, which face the same request-id-on-every-
/// response contract.
pub(super) fn attach_request_id(mut response: Response, request_id: &str) -> Response {
    if let Ok(value) = HeaderValue::from_str(request_id) {
        response.headers_mut().insert("x-request-id", value);
    }
    response
}
