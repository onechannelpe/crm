//! Two-phase streamed upload.
//!
//! The manifest reserves a slot, then the blob streams directly to disk while
//! being hashed. Blob requests are signed over `upload_id` because the streamed
//! body cannot be buffered just for request verification.

use axum::Json;
use axum::body::BodyDataStream;
use axum::extract::{Path as AxumPath, Request, State};
use axum::http::{HeaderMap, StatusCode, header::CONTENT_LENGTH};
use axum::response::{IntoResponse, Response};
use futures_util::TryStreamExt;
use pipeline::config::embedded;
use pipeline::config::mapping::SourceMapping;
use sha2::{Digest, Sha256};
use shared::auth;
use shared::error::{ApiError, RequestError};
use std::collections::HashMap;
use std::io;
use std::path::Path;
use std::pin::Pin;
use std::sync::{Arc, Mutex};
use std::task::{Context, Poll};
use std::time::{Duration, Instant};
use tokio::fs::{self, File};
use tokio::io::{AsyncWrite, AsyncWriteExt, BufWriter};
use tokio_util::io::StreamReader;
use uuid::Uuid;

use crate::ingest::api::{IngestState, attach_request_id};
use crate::ingest::contracts::{RegisterUploadRequest, RegisterUploadResponse, UploadBlobResponse};
use crate::ingest::runner::JobRequest;

const UPLOAD_RESERVATION_TTL: Duration = Duration::from_secs(900);
const INGEST_REGISTER_COST: u32 = 5;
const INGEST_BLOB_COST: u32 = 60;

#[derive(Debug, Clone)]
pub struct PendingUpload {
    pub mapping: SourceMapping,
    pub snapshot_label: String,
    pub snapshot_date: String,
    pub size_bytes: u64,
    pub sha256: String,
    reserved_at: Instant,
    claimed: bool,
}

pub struct UploadRegistry {
    pending: Mutex<HashMap<String, PendingUpload>>,
    max_queued: usize,
}

impl UploadRegistry {
    pub fn new(max_queued: usize) -> Self {
        Self {
            pending: Mutex::new(HashMap::new()),
            max_queued,
        }
    }

    pub fn reserve(
        &self,
        request: RegisterUploadRequest,
        mapping: SourceMapping,
        running: i64,
    ) -> Result<String, ApiError> {
        let mut pending = self.lock();
        sweep_expired(&mut pending);

        let occupied = pending.len() as i64 + running;

        if occupied >= self.max_queued as i64 {
            return Err(ApiError::Service(format!(
                "ingest queue is full ({occupied}/{} slots in use)",
                self.max_queued
            )));
        }

        let upload_id = Uuid::new_v4().to_string();

        pending.insert(
            upload_id.clone(),
            PendingUpload {
                mapping,
                snapshot_label: request.snapshot_label,
                snapshot_date: request.snapshot_date,
                size_bytes: request.size_bytes,
                sha256: request.sha256,
                reserved_at: Instant::now(),
                claimed: false,
            },
        );

        Ok(upload_id)
    }

    pub fn claim(&self, upload_id: &str) -> Result<PendingUpload, ApiError> {
        let mut pending = self.lock();

        match pending.get_mut(upload_id) {
            None => Err(ApiError::NotFound(format!(
                "no pending upload with id {upload_id}"
            ))),
            Some(entry) if entry.claimed => Err(ApiError::Conflict(format!(
                "upload {upload_id} is already being received"
            ))),
            Some(entry) => {
                entry.claimed = true;
                Ok(entry.clone())
            }
        }
    }

    pub fn take(&self, upload_id: &str) {
        self.lock().remove(upload_id);
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, HashMap<String, PendingUpload>> {
        self.pending.lock().expect("upload registry lock poisoned")
    }
}

// Claimed uploads are removed by the active request and do not expire by age.
fn sweep_expired(pending: &mut HashMap<String, PendingUpload>) {
    pending.retain(|_, upload| {
        upload.claimed || upload.reserved_at.elapsed() < UPLOAD_RESERVATION_TTL
    });
}

// Reservations and queued jobs are in-memory only, so leftover uploads cannot
// be resumed after a restart.
pub fn clear_upload_dir(dir: &Path) {
    let entries = match std::fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(err) => {
            tracing::warn!(
                dir = %dir.display(),
                %err,
                "could not read upload directory"
            );
            return;
        }
    };

    let mut cleared = 0u32;

    for entry in entries.flatten() {
        if std::fs::remove_file(entry.path()).is_ok() {
            cleared += 1;
        }
    }

    if cleared > 0 {
        tracing::warn!(cleared, "cleared leftover uploads from a previous run");
    }
}

pub async fn handle_register_upload(
    State(state): State<Arc<IngestState>>,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> Result<Response, RequestError> {
    let request_id = Uuid::new_v4().to_string();

    register_upload(state, headers, body, request_id).await
}

#[tracing::instrument(
    skip(state, headers, body),
    fields(request_id = %request_id)
)]
async fn register_upload(
    state: Arc<IngestState>,
    headers: HeaderMap,
    body: axum::body::Bytes,
    request_id: String,
) -> Result<Response, RequestError> {
    let key_id = auth::verify_signed_request(&headers, &body, &state.hmac, &state.limiter)
        .map_err(|e| e.with_request_id(request_id.clone()))?;

    let limiter_key = format!("ingest_uploads:{key_id}");

    if !state.limiter.allow(&limiter_key, INGEST_REGISTER_COST) {
        return Err(ApiError::RateLimit.with_request_id(request_id));
    }

    let request: RegisterUploadRequest = serde_json::from_slice(&body).map_err(|_| {
        ApiError::Validation("invalid JSON body".into()).with_request_id(request_id.clone())
    })?;

    request
        .validate(state.max_upload_bytes)
        .map_err(|e| e.with_request_id(request_id.clone()))?;

    let mapping = embedded::mapping_for(&request.source_key).map_err(|_| {
        ApiError::Validation(format!(
            "unknown source_key: {}. known: {}",
            request.source_key,
            embedded::source_keys().collect::<Vec<_>>().join(", ")
        ))
        .with_request_id(request_id.clone())
    })?;

    let running = state.store.count_running().map_err(|err| {
        tracing::error!(%err, "could not count running ingest jobs");
        ApiError::Internal.with_request_id(request_id.clone())
    })?;

    let upload_id = state
        .registry
        .reserve(request, mapping, running)
        .map_err(|e| e.with_request_id(request_id.clone()))?;

    Ok(attach_request_id(
        (
            StatusCode::ACCEPTED,
            Json(RegisterUploadResponse { upload_id }),
        )
            .into_response(),
        &request_id,
    ))
}

pub async fn handle_upload_blob(
    State(state): State<Arc<IngestState>>,
    AxumPath(upload_id): AxumPath<String>,
    request: Request,
) -> Result<Response, RequestError> {
    let request_id = Uuid::new_v4().to_string();

    upload_blob(state, upload_id, request, request_id).await
}

#[tracing::instrument(
    skip(state, request),
    fields(request_id = %request_id)
)]
async fn upload_blob(
    state: Arc<IngestState>,
    upload_id: String,
    request: Request,
    request_id: String,
) -> Result<Response, RequestError> {
    let key_id = auth::verify_signed_request(
        request.headers(),
        upload_id.as_bytes(),
        &state.hmac,
        &state.limiter,
    )
    .map_err(|e| e.with_request_id(request_id.clone()))?;

    let limiter_key = format!("ingest_uploads_blob:{key_id}");

    if !state.limiter.allow(&limiter_key, INGEST_BLOB_COST) {
        return Err(ApiError::RateLimit.with_request_id(request_id));
    }

    let pending = state
        .registry
        .claim(&upload_id)
        .map_err(|e| e.with_request_id(request_id.clone()))?;

    if let Some(declared) = declared_content_length(request.headers())
        && declared != pending.size_bytes
    {
        state.registry.take(&upload_id);

        return Err(ApiError::Validation(format!(
            "content-length {declared} does not match the registered size_bytes {}",
            pending.size_bytes
        ))
        .with_request_id(request_id));
    }

    let part_path = state.upload_dir.join(format!("{upload_id}.part"));
    let final_path = state.upload_dir.join(format!("{upload_id}.csv"));

    let stream = request.into_body().into_data_stream();

    let digest = match stream_to_hashed_file(&part_path, stream, pending.size_bytes).await {
        Ok(digest) => digest,
        Err(err) => {
            let _ = fs::remove_file(&part_path).await;
            state.registry.take(&upload_id);

            return Err(
                ApiError::Validation(format!("upload failed: {err}")).with_request_id(request_id)
            );
        }
    };

    if digest != pending.sha256 {
        let _ = fs::remove_file(&part_path).await;
        state.registry.take(&upload_id);

        return Err(ApiError::Validation("sha256 mismatch".into()).with_request_id(request_id));
    }

    if let Err(err) = fs::rename(&part_path, &final_path).await {
        tracing::error!(%err, "could not finalize uploaded file");

        let _ = fs::remove_file(&part_path).await;
        state.registry.take(&upload_id);

        return Err(ApiError::Internal.with_request_id(request_id));
    }

    let job_id = Uuid::new_v4().to_string();

    if let Err(err) = state.store.insert_queued(
        &job_id,
        &pending.mapping.source_key,
        &pending.snapshot_label,
    ) {
        tracing::error!(%err, "could not create ingest job record");

        let _ = fs::remove_file(&final_path).await;
        state.registry.take(&upload_id);

        return Err(ApiError::Internal.with_request_id(request_id));
    }

    state.registry.take(&upload_id);

    state.queue.enqueue(JobRequest {
        job_id: job_id.clone(),
        contacts_db_path: state.contacts_db_path.clone(),
        mapping: pending.mapping,
        input_path: final_path.to_string_lossy().into_owned(),
        snapshot_label: pending.snapshot_label,
        snapshot_date: pending.snapshot_date,
        settings: state.settings,
    });

    Ok(attach_request_id(
        (StatusCode::ACCEPTED, Json(UploadBlobResponse { job_id })).into_response(),
        &request_id,
    ))
}

fn declared_content_length(headers: &HeaderMap) -> Option<u64> {
    headers
        .get(CONTENT_LENGTH)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
}

// Enforce the declared size while streaming, including chunked requests without
// Content-Length.
async fn stream_to_hashed_file(
    path: &Path,
    stream: BodyDataStream,
    limit: u64,
) -> Result<String, io::Error> {
    let stream_with_io_error = stream.map_err(io::Error::other);
    let mut reader = StreamReader::new(stream_with_io_error);

    let file = File::create(path).await?;
    let mut writer = HashingLimitedWriter::new(BufWriter::new(file), limit);

    tokio::io::copy(&mut reader, &mut writer).await?;
    writer.flush().await?;

    Ok(writer.finalize_hex())
}

// Hash while writing and reject bytes beyond the registered size.
struct HashingLimitedWriter<W> {
    inner: W,
    hasher: Sha256,
    written: u64,
    limit: u64,
}

impl<W> HashingLimitedWriter<W> {
    fn new(inner: W, limit: u64) -> Self {
        Self {
            inner,
            hasher: Sha256::new(),
            written: 0,
            limit,
        }
    }

    fn finalize_hex(self) -> String {
        hex::encode(self.hasher.finalize())
    }
}

impl<W: AsyncWrite + Unpin> AsyncWrite for HashingLimitedWriter<W> {
    fn poll_write(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<io::Result<usize>> {
        let this = self.get_mut();

        if this.written.saturating_add(buf.len() as u64) > this.limit {
            return Poll::Ready(Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "upload exceeded its declared size_bytes",
            )));
        }

        match Pin::new(&mut this.inner).poll_write(cx, buf) {
            Poll::Ready(Ok(n)) => {
                this.hasher.update(&buf[..n]);
                this.written += n as u64;
                Poll::Ready(Ok(n))
            }
            other => other,
        }
    }

    fn poll_flush(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<io::Result<()>> {
        Pin::new(&mut self.get_mut().inner).poll_flush(cx)
    }

    fn poll_shutdown(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<io::Result<()>> {
        Pin::new(&mut self.get_mut().inner).poll_shutdown(cx)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pipeline::config::mapping::SourceMapping;

    fn mapping() -> SourceMapping {
        pipeline::config::embedded::mapping_for("osiptel_scan_sunat").expect("embedded mapping")
    }

    fn manifest(size_bytes: u64) -> RegisterUploadRequest {
        RegisterUploadRequest {
            source_key: "osiptel_scan_sunat".into(),
            snapshot_label: "piura".into(),
            snapshot_date: "2026-08-13".into(),
            size_bytes,
            sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855".into(),
        }
    }

    #[test]
    fn reserve_fills_up_to_capacity_then_rejects() {
        let registry = UploadRegistry::new(2);

        registry.reserve(manifest(1), mapping(), 0).expect("first");
        registry.reserve(manifest(1), mapping(), 0).expect("second");

        let err = registry.reserve(manifest(1), mapping(), 0).unwrap_err();

        assert!(matches!(err, ApiError::Service(_)));
    }

    #[test]
    fn running_jobs_count_toward_capacity() {
        let registry = UploadRegistry::new(2);

        registry.reserve(manifest(1), mapping(), 0).expect("first");

        let err = registry.reserve(manifest(1), mapping(), 1).unwrap_err();

        assert!(matches!(err, ApiError::Service(_)));
    }

    #[test]
    fn claim_is_exclusive() {
        let registry = UploadRegistry::new(4);

        let upload_id = registry
            .reserve(manifest(1), mapping(), 0)
            .expect("reserve");

        registry.claim(&upload_id).expect("first claim");

        let err = registry.claim(&upload_id).unwrap_err();

        assert!(matches!(err, ApiError::Conflict(_)));
    }

    #[test]
    fn take_frees_the_slot() {
        let registry = UploadRegistry::new(1);

        let upload_id = registry
            .reserve(manifest(1), mapping(), 0)
            .expect("reserve");

        registry.take(&upload_id);

        registry
            .reserve(manifest(1), mapping(), 0)
            .expect("slot freed");
    }

    #[test]
    fn clear_upload_dir_removes_leftover_files() {
        let dir = tempfile::tempdir().expect("tempdir");

        std::fs::write(dir.path().join("orphaned-upload-id.csv"), b"leftover").expect("write");

        std::fs::write(dir.path().join("another.part"), b"leftover").expect("write");

        clear_upload_dir(dir.path());

        let remaining: Vec<_> = std::fs::read_dir(dir.path()).expect("read dir").collect();

        assert!(
            remaining.is_empty(),
            "upload dir should be empty after clearing"
        );
    }

    #[test]
    fn unclaimed_reservations_expire_but_claimed_ones_do_not() {
        let registry = UploadRegistry::new(1);

        let upload_id = registry
            .reserve(manifest(1), mapping(), 0)
            .expect("reserve");

        registry.claim(&upload_id).expect("claim");

        let mut pending = registry.lock();

        pending.get_mut(&upload_id).expect("entry").reserved_at =
            Instant::now() - UPLOAD_RESERVATION_TTL - Duration::from_secs(1);

        sweep_expired(&mut pending);

        assert!(
            pending.contains_key(&upload_id),
            "claimed entries must not expire"
        );
    }
}
