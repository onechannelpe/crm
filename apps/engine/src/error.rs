use axum::{Json, http::StatusCode, response::IntoResponse};
use chrono::{DateTime, Utc};
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("data error: {0}")]
    Data(String),

    #[error("unauthorized")]
    Unauthorized,

    #[error("rate limit exceeded")]
    RateLimit,

    #[error("quota exceeded")]
    QuotaExceeded,

    #[error("forbidden")]
    Forbidden,
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    quota_resets_at: Option<DateTime<Utc>>,
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        let (status, message, quota_reset) = match self {
            Error::Data(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg, None),
            Error::Unauthorized => (StatusCode::UNAUTHORIZED, self.to_string(), None),
            Error::RateLimit => (StatusCode::TOO_MANY_REQUESTS, self.to_string(), None),
            Error::QuotaExceeded => {
                let now = Utc::now();
                let tomorrow = now.date_naive().succ_opt().unwrap();
                let reset_time = tomorrow.and_hms_opt(0, 0, 0).unwrap();
                let reset_dt = DateTime::from_naive_utc_and_offset(reset_time, Utc);
                (
                    StatusCode::TOO_MANY_REQUESTS,
                    self.to_string(),
                    Some(reset_dt),
                )
            }
            Error::Forbidden => (StatusCode::FORBIDDEN, self.to_string(), None),
        };

        (
            status,
            Json(ErrorBody {
                error: message,
                quota_resets_at: quota_reset,
            }),
        )
            .into_response()
    }
}

pub type Result<T> = std::result::Result<T, Error>;
