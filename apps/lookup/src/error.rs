use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("data error: {0}")]
    Data(String),
    
    #[error("unauthorized")]
    Unauthorized,
    
    #[error("rate limit exceeded")]
    RateLimit,
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self {
            Error::Data(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            Error::Unauthorized => (StatusCode::UNAUTHORIZED, self.to_string()),
            Error::RateLimit => (StatusCode::TOO_MANY_REQUESTS, self.to_string()),
        };

        (status, Json(ErrorBody { error: message })).into_response()
    }
}

pub type Result<T> = std::result::Result<T, Error>;
