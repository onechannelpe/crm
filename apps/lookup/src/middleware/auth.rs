use crate::{api::state::AppState, error::Error};
use axum::{extract::{Request, Extension}, middleware::Next, response::Response};
use sha2::{Digest, Sha256};
use std::sync::Arc;

pub struct AuthValidator {
    key_hashes: Vec<String>,
}

impl AuthValidator {
    pub fn new(keys: Vec<String>) -> Self {
        let key_hashes = keys.iter().map(|k| Self::hash(k)).collect();
        Self { key_hashes }
    }
    
    fn hash(key: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(key.as_bytes());
        hex::encode(hasher.finalize())
    }
    
    pub fn validate(&self, key: &str) -> bool {
        let hash = Self::hash(key);
        self.key_hashes.contains(&hash)
    }
}

pub async fn require_auth(
    Extension(state): Extension<Arc<AppState>>,
    request: Request,
    next: Next,
) -> Result<Response, Error> {
    let key = request
        .headers()
        .get("x-api-key")
        .and_then(|v| v.to_str().ok())
        .ok_or(Error::Unauthorized)?;
    
    if !state.auth.validate(key) {
        return Err(Error::Unauthorized);
    }
    
    Ok(next.run(request).await)
}
