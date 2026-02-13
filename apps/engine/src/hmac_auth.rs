use crate::error::RequestError;
use axum::{extract::Request, middleware::Next, response::Response};
use ::hmac::{Hmac, Mac};
use sha2::Sha256;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha256 = Hmac<Sha256>;

const MAX_TIMESTAMP_DRIFT_SECS: u64 = 300; // 5 minutes

pub struct HmacVerifier {
    secret: Vec<u8>,
}

impl HmacVerifier {
    pub fn new(secret: &str) -> Self {
        Self {
            secret: secret.as_bytes().to_vec(),
        }
    }

    fn verify(&self, body: &[u8], timestamp: u64, signature: &str) -> bool {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        if now.abs_diff(timestamp) > MAX_TIMESTAMP_DRIFT_SECS {
            return false;
        }

        let mut mac = match HmacSha256::new_from_slice(&self.secret) {
            Ok(m) => m,
            Err(_) => return false,
        };

        mac.update(&timestamp.to_be_bytes());
        mac.update(body);

        let expected = hex::encode(mac.finalize().into_bytes());
        expected == signature
    }
}

pub async fn require_hmac(
    request: Request,
    next: Next,
) -> Result<Response, RequestError> {
    let verifier = request
        .extensions()
        .get::<Arc<HmacVerifier>>()
        .cloned()
        .ok_or(RequestError::InvalidSignature)?;

    let timestamp: u64 = request
        .headers()
        .get("x-timestamp")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse().ok())
        .ok_or(RequestError::InvalidSignature)?;

    let signature = request
        .headers()
        .get("x-signature")
        .and_then(|v| v.to_str().ok())
        .ok_or(RequestError::InvalidSignature)?
        .to_string();

    let (parts, body) = request.into_parts();
    let body_bytes = axum::body::to_bytes(body, 1024 * 64)
        .await
        .map_err(|_| RequestError::InvalidSignature)?;

    if !verifier.verify(&body_bytes, timestamp, &signature) {
        return Err(RequestError::InvalidSignature);
    }

    let request = Request::from_parts(parts, axum::body::Body::from(body_bytes));
    Ok(next.run(request).await)
}
