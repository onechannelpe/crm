use std::io;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PipelineError {
    #[error("invalid arguments: {0}")]
    Args(String),
    #[error("io error: {0}")]
    Io(#[from] io::Error),
    #[error("database error: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),
    #[error("csv error: {0}")]
    Csv(#[from] csv::Error),
}
