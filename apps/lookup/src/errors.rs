use axum::{http::StatusCode, response::Response, Json};
use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ApiError {
    #[error("Data loading failed: {0}")]
    DataLoad(String),
    
    #[error("Invalid request: {0}")]
    InvalidRequest(String),
    
    #[error("Unauthorized")]
    Unauthorized,
    
    #[error("Rate limit exceeded")]
    RateLimitExceeded,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

impl axum::response::IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            ApiError::DataLoad(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            ApiError::InvalidRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            ApiError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".to_string()),
            ApiError::RateLimitExceeded => (StatusCode::TOO_MANY_REQUESTS, "Rate limit exceeded".to_string()),
        };

        (status, Json(ErrorResponse { error: message })).into_response()
    }
}

pub type ApiResult<T> = Result<T, ApiError>;
