use crate::error::ApiError;
use crate::hmac::HmacVerifier;
use crate::rate_limit::RateLimiter;
use axum::http::HeaderMap;

/// Verifies a signed HTTP request.
///
/// Extracts `x-key-id`, `x-timestamp`, and `x-signature` headers, verifies
/// the HMAC-SHA256 signature over `body`, and rate-limits failed attempts so
/// that brute-forcing credentials is not viable even with a valid key ID.
///
/// Returns the verified `key_id` string on success so callers can use it to
/// build their own per-key rate-limit buckets.
pub fn verify_signed_request<'a>(
    headers: &'a HeaderMap,
    body: &[u8],
    hmac: &HmacVerifier,
    limiter: &RateLimiter,
) -> Result<&'a str, ApiError> {
    let key_id = require_header(headers, "x-key-id")?;
    let ts = require_header(headers, "x-timestamp")?;
    let sig = require_header(headers, "x-signature")?;

    if let Err(err) = hmac.verify(key_id, ts, sig, body) {
        // Rate-limit the failure bucket whether the key ID is known or not.
        // Using a shared "unknown" bucket prevents leaking which key IDs exist.
        let bucket = auth_fail_bucket(hmac, key_id);
        if !limiter.allow(&bucket, 1) {
            return Err(ApiError::RateLimit);
        }
        return Err(err);
    }

    Ok(key_id)
}

fn auth_fail_bucket(hmac: &HmacVerifier, key_id: &str) -> String {
    if hmac.has_key_id(key_id) {
        format!("auth_fail:{key_id}")
    } else {
        "auth_fail:unknown".to_owned()
    }
}

fn require_header<'a>(headers: &'a HeaderMap, name: &str) -> Result<&'a str, ApiError> {
    headers
        .get(name)
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| ApiError::Unauthorized(format!("missing header: {name}")))
}
