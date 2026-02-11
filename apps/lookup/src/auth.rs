use crate::errors::ApiError;
use axum::{
    extract::Request,
    http::HeaderMap,
    middleware::Next,
    response::Response,
};
use sha2::{Digest, Sha256};
use std::sync::Arc;

pub struct AuthService {
    api_key_hashes: Vec<String>,
}

impl AuthService {
    pub fn new(api_keys: Vec<String>) -> Self {
        let api_key_hashes = api_keys
            .iter()
            .map(|key| Self::hash_key(key))
            .collect();
        
        Self { api_key_hashes }
    }
    
    fn hash_key(key: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(key.as_bytes());
        hex::encode(hasher.finalize())
    }
    
    pub fn validate_key(&self, key: &str) -> bool {
        let hash = Self::hash_key(key);
        self.api_key_hashes.contains(&hash)
    }
}

pub async fn auth_middleware(
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Result<Response, ApiError> {
    let auth_header = headers
        .get("x-api-key")
        .and_then(|v| v.to_str().ok())
        .ok_or(ApiError::Unauthorized)?;
    
    let auth_service = request
        .extensions()
        .get::<Arc<AuthService>>()
        .ok_or(ApiError::Unauthorized)?;
    
    if !auth_service.validate_key(auth_header) {
        return Err(ApiError::Unauthorized);
    }
    
    Ok(next.run(request).await)
}
