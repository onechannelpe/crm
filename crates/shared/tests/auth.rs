use axum::http::HeaderMap;
use shared::auth::verify_signed_request;
use shared::error::ApiError;
use shared::hmac::{HmacVerifier, sign};
use shared::rate_limit::RateLimiter;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

fn make_hmac(key_id: &str, secret: &str) -> HmacVerifier {
    HmacVerifier::new(
        HashMap::from([(key_id.to_string(), secret.to_string())]),
        300,
    )
}

/// Returns a valid HeaderMap + the timestamp used to sign.
fn signed_headers(key_id: &str, secret: &str, body: &[u8]) -> HeaderMap {
    let ts = now_secs();
    let sig = sign(secret, ts, body).expect("hmac sign");
    let mut h = HeaderMap::new();
    h.insert("x-key-id", key_id.parse().unwrap());
    h.insert("x-timestamp", ts.to_string().parse().unwrap());
    h.insert("x-signature", sig.parse().unwrap());
    h
}

// happy path

#[test]
fn valid_request_returns_key_id() {
    let body = b"payload";
    let headers = signed_headers("web", "secret", body);
    let hmac = make_hmac("web", "secret");
    let limiter = RateLimiter::new(100);

    let result = verify_signed_request(&headers, body, &hmac, &limiter);
    assert_eq!(result.unwrap(), "web");
}

// missing headers

#[test]
fn missing_key_id_returns_unauthorized() {
    let body = b"payload";
    let mut h = signed_headers("web", "secret", body);
    h.remove("x-key-id");
    let hmac = make_hmac("web", "secret");
    let limiter = RateLimiter::new(100);

    assert!(matches!(
        verify_signed_request(&h, body, &hmac, &limiter),
        Err(ApiError::Unauthorized(_))
    ));
}

#[test]
fn missing_timestamp_returns_unauthorized() {
    let body = b"payload";
    let mut h = signed_headers("web", "secret", body);
    h.remove("x-timestamp");
    let hmac = make_hmac("web", "secret");
    let limiter = RateLimiter::new(100);

    assert!(matches!(
        verify_signed_request(&h, body, &hmac, &limiter),
        Err(ApiError::Unauthorized(_))
    ));
}

#[test]
fn missing_signature_returns_unauthorized() {
    let body = b"payload";
    let mut h = signed_headers("web", "secret", body);
    h.remove("x-signature");
    let hmac = make_hmac("web", "secret");
    let limiter = RateLimiter::new(100);

    assert!(matches!(
        verify_signed_request(&h, body, &hmac, &limiter),
        Err(ApiError::Unauthorized(_))
    ));
}

// bad credentials

#[test]
fn wrong_signature_returns_unauthorized() {
    let body = b"payload";
    let mut h = signed_headers("web", "secret", body);
    h.insert("x-signature", "deadbeef".parse().unwrap());
    let hmac = make_hmac("web", "secret");
    let limiter = RateLimiter::new(100);

    assert!(matches!(
        verify_signed_request(&h, body, &hmac, &limiter),
        Err(ApiError::Unauthorized(_))
    ));
}

#[test]
fn unknown_key_id_returns_unauthorized() {
    let body = b"payload";
    let h = signed_headers("unknown", "secret", body);
    let hmac = make_hmac("web", "secret");
    let limiter = RateLimiter::new(100);

    assert!(matches!(
        verify_signed_request(&h, body, &hmac, &limiter),
        Err(ApiError::Unauthorized(_))
    ));
}

// rate limiting of auth failures

#[test]
fn repeated_auth_failures_trigger_rate_limit() {
    let body = b"payload";
    let hmac = make_hmac("web", "secret");
    let limiter = RateLimiter::new(1); // 1 token total

    // First attempt: consumes the 1 token, returns Unauthorized.
    let h1 = signed_headers("unknown", "secret", body);
    assert!(matches!(
        verify_signed_request(&h1, body, &hmac, &limiter),
        Err(ApiError::Unauthorized(_))
    ));

    // Second attempt: bucket exhausted, returns RateLimit.
    let h2 = signed_headers("unknown", "secret", body);
    assert!(matches!(
        verify_signed_request(&h2, body, &hmac, &limiter),
        Err(ApiError::RateLimit)
    ));
}
