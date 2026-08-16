use serde::{Deserialize, Serialize};
use shared::error::ApiError;

use crate::ingest::job::JobRecord;

#[derive(Debug, Deserialize)]
pub struct RegisterUploadRequest {
    pub source_key: String,
    pub snapshot_label: String,
    pub snapshot_date: String,

    /// Declared upfront so oversized uploads can be rejected while streaming.
    pub size_bytes: u64,

    /// Lowercase hex SHA-256, verified against the uploaded bytes.
    pub sha256: String,
}

#[derive(Debug, Serialize)]
pub struct RegisterUploadResponse {
    pub upload_id: String,
}

#[derive(Debug, Serialize)]
pub struct UploadBlobResponse {
    pub job_id: String,
}

#[derive(Debug, Serialize)]
pub struct IngestJobResponse {
    #[serde(flatten)]
    pub job: JobRecord,
}

#[derive(Debug, Serialize)]
pub struct IngestSource {
    pub source_key: String,
    pub source_name: String,
}

#[derive(Debug, Serialize)]
pub struct ListIngestSourcesResponse {
    pub sources: Vec<IngestSource>,
}

impl RegisterUploadRequest {
    pub fn validate(&self, max_upload_bytes: u64) -> Result<(), ApiError> {
        if self.source_key.trim().is_empty() {
            return Err(ApiError::Validation("source_key is required".into()));
        }

        if self.snapshot_label.trim().is_empty() {
            return Err(ApiError::Validation("snapshot_label is required".into()));
        }

        if !is_iso_date(&self.snapshot_date) {
            return Err(ApiError::Validation(
                "snapshot_date must be YYYY-MM-DD".into(),
            ));
        }

        if self.size_bytes == 0 {
            return Err(ApiError::Validation("size_bytes must be at least 1".into()));
        }

        if self.size_bytes > max_upload_bytes {
            return Err(ApiError::Validation(format!(
                "size_bytes {} exceeds the {max_upload_bytes} byte limit",
                self.size_bytes
            )));
        }

        if !is_sha256_hex(&self.sha256) {
            return Err(ApiError::Validation(
                "sha256 must be 64 lowercase hex characters".into(),
            ));
        }

        Ok(())
    }
}

fn is_iso_date(value: &str) -> bool {
    let bytes = value.as_bytes();

    bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && [0, 1, 2, 3, 5, 6, 8, 9]
            .iter()
            .all(|&i| bytes[i].is_ascii_digit())
}

fn is_sha256_hex(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
}

#[cfg(test)]
mod tests {
    use super::*;

    const MAX_BYTES: u64 = 2 * 1024 * 1024 * 1024;
    const VALID_SHA256: &str = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    fn request(snapshot_date: &str) -> RegisterUploadRequest {
        RegisterUploadRequest {
            source_key: "osiptel_scan_sunat".into(),
            snapshot_label: "piura".into(),
            snapshot_date: snapshot_date.into(),
            size_bytes: 1024,
            sha256: VALID_SHA256.into(),
        }
    }

    #[test]
    fn accepts_an_iso_date() {
        assert!(request("2026-08-13").validate(MAX_BYTES).is_ok());
    }

    #[test]
    fn rejects_a_non_iso_date() {
        for bad in ["13-08-2026", "2026/08/13", "2026-8-13", "", "2026-08-1x"] {
            assert!(
                request(bad).validate(MAX_BYTES).is_err(),
                "should have rejected {bad}"
            );
        }
    }

    #[test]
    fn rejects_a_blank_snapshot_label() {
        let mut req = request("2026-08-13");
        req.snapshot_label = "  ".into();

        assert!(req.validate(MAX_BYTES).is_err());
    }

    #[test]
    fn rejects_a_zero_size() {
        let mut req = request("2026-08-13");
        req.size_bytes = 0;

        assert!(req.validate(MAX_BYTES).is_err());
    }

    #[test]
    fn rejects_a_size_over_the_limit() {
        let mut req = request("2026-08-13");
        req.size_bytes = MAX_BYTES + 1;

        assert!(req.validate(MAX_BYTES).is_err());
    }

    #[test]
    fn accepts_a_size_at_the_limit() {
        let mut req = request("2026-08-13");
        req.size_bytes = MAX_BYTES;

        assert!(req.validate(MAX_BYTES).is_ok());
    }

    #[test]
    fn rejects_a_malformed_sha256() {
        for bad in ["", "not-hex", "ABCDEF", "e3b0c4"] {
            let mut req = request("2026-08-13");
            req.sha256 = bad.into();

            assert!(
                req.validate(MAX_BYTES).is_err(),
                "should have rejected {bad}"
            );
        }
    }
}
