//! Error handling for phone lookup API
//! 
//! Centralizes all error types with proper HTTP status mapping.
//! Follows fail-fast principle with explicit error types.

use axum::{
    http::StatusCode,
    response::Response,
    Json as AxumJson,
};
use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ApiError {
    #[error("Data loading failed: {0}")]
    DataLoad(String),
    
    #[error("Invalid query parameter: {0}")]
    InvalidQuery(String),
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
    message: String,
}

// Convert our errors to HTTP responses
impl axum::response::IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, error_type, message) = match self {
            ApiError::DataLoad(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "data_load_error",
                msg,
            ),
            ApiError::InvalidQuery(msg) => (
                StatusCode::BAD_REQUEST,
                "invalid_query",
                msg,
            ),
        };

        let error_response = ErrorResponse {
            error: error_type.to_string(),
            message,
        };

        (status, AxumJson(error_response)).into_response()
    }
}

pub type ApiResult<T> = Result<T, ApiError>;
