use crate::{api::state::AppState, error::Error, middleware::user::UserContext};
use axum::{
    extract::{Extension, Request},
    middleware::Next,
    response::Response,
};
use sha2::{Digest, Sha256};
use std::{collections::HashMap, sync::Arc};

pub struct AuthValidator {
    key_map: HashMap<String, UserContext>,
}

impl AuthValidator {
    pub fn new(keys: Vec<(String, crate::config::ApiKeyEntry)>) -> Self {
        let key_map = keys
            .into_iter()
            .map(|(raw_key, entry)| {
                let key_hash = Self::hash(&raw_key);
                let context = UserContext {
                    user_id: entry.user_id,
                    role: entry.role,
                };
                (key_hash, context)
            })
            .collect();
        Self { key_map }
    }

    fn hash(key: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(key.as_bytes());
        hex::encode(hasher.finalize())
    }

    pub fn validate(&self, key: &str) -> Option<UserContext> {
        let hash = Self::hash(key);
        self.key_map.get(&hash).copied()
    }
}

pub async fn require_auth(
    Extension(state): Extension<Arc<AppState>>,
    mut request: Request,
    next: Next,
) -> Result<Response, Error> {
    let key = request
        .headers()
        .get("x-api-key")
        .and_then(|v| v.to_str().ok())
        .ok_or(Error::Unauthorized)?;

    let user_ctx = state.auth.validate(key).ok_or(Error::Unauthorized)?;

    request.extensions_mut().insert(user_ctx);
    Ok(next.run(request).await)
}
