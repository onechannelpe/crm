use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum StartupError {
    #[error("configuration error: {0}")]
    Config(String),
    #[error("database error: {0}")]
    Database(String),
}

#[derive(Debug, Error)]
pub enum ApiError {
    #[error("unauthorized: {0}")]
    Unauthorized(String),
    #[error("validation: {0}")]
    Validation(String),
    #[error("rate limit exceeded")]
    RateLimit,
    #[error("service unavailable: {0}")]
    Service(String),
    #[error("internal error")]
    Internal,
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, msg) = match self {
            Self::Unauthorized(m) => (StatusCode::UNAUTHORIZED, m),
            Self::Validation(m) => (StatusCode::BAD_REQUEST, m),
            Self::RateLimit => (StatusCode::TOO_MANY_REQUESTS, "rate limit exceeded".into()),
            Self::Service(_) => (
                StatusCode::SERVICE_UNAVAILABLE,
                "service unavailable".into(),
            ),
            Self::Internal => (StatusCode::INTERNAL_SERVER_ERROR, "internal error".into()),
        };
        (status, axum::Json(ErrorBody { error: msg })).into_response()
    }
}
