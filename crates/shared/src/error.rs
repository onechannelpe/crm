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
    #[serde(skip_serializing_if = "Option::is_none")]
    request_id: Option<String>,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, msg) = self.status_and_message();
        (
            status,
            axum::Json(ErrorBody {
                error: msg,
                request_id: None,
            }),
        )
            .into_response()
    }
}

pub struct RequestError {
    request_id: String,
    error: ApiError,
}

impl ApiError {
    pub fn with_request_id(self, request_id: impl Into<String>) -> RequestError {
        RequestError {
            request_id: request_id.into(),
            error: self,
        }
    }

    fn status_and_message(self) -> (StatusCode, String) {
        match self {
            Self::Unauthorized(m) => (StatusCode::UNAUTHORIZED, m),
            Self::Validation(m) => (StatusCode::BAD_REQUEST, m),
            Self::RateLimit => (StatusCode::TOO_MANY_REQUESTS, "rate limit exceeded".into()),
            Self::Service(_) => (
                StatusCode::SERVICE_UNAVAILABLE,
                "service unavailable".into(),
            ),
            Self::Internal => (StatusCode::INTERNAL_SERVER_ERROR, "internal error".into()),
        }
    }
}

impl IntoResponse for RequestError {
    fn into_response(self) -> Response {
        let request_id = self.request_id;
        let (status, msg) = self.error.status_and_message();
        let mut response = (
            status,
            axum::Json(ErrorBody {
                error: msg,
                request_id: Some(request_id.clone()),
            }),
        )
            .into_response();

        if let Ok(value) = axum::http::HeaderValue::from_str(&request_id) {
            response.headers_mut().insert("x-request-id", value);
        }

        response
    }
}
