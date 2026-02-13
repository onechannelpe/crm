use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum StartupError {
    #[error("config: {0}")]
    Config(String),

    #[error("csv: {0}")]
    Csv(String),

    #[error("server: {0}")]
    Server(String),
}

#[derive(Debug, thiserror::Error)]
pub enum RequestError {
    #[error("invalid signature")]
    InvalidSignature,

    #[error("rate limited")]
    RateLimited,

    #[error("validation: {0}")]
    Validation(String),
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

impl IntoResponse for RequestError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match &self {
            RequestError::InvalidSignature => (StatusCode::UNAUTHORIZED, self.to_string()),
            RequestError::RateLimited => (StatusCode::TOO_MANY_REQUESTS, self.to_string()),
            RequestError::Validation(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
        };

        (status, Json(ErrorBody { error: message })).into_response()
    }
}
