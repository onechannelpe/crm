use crate::errors::StartupError;
use std::env;
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub db_path: String,
    pub hmac_secret: String,
    pub hmac_max_skew_secs: i64,
    pub rate_limit_per_ip: u32,
    pub max_limit: usize,
}

impl Config {
    fn default_db_path() -> String {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("data")
            .join("contacts.sqlite")
            .to_string_lossy()
            .into_owned()
    }

    pub fn load() -> Result<Self, StartupError> {
        let hmac_secret = env::var("ENGINE_HMAC_SECRET")
            .map_err(|_| StartupError::Config("ENGINE_HMAC_SECRET is required".into()))?;
        let db_path = env::var("ENGINE_DB_PATH").unwrap_or_else(|_| Self::default_db_path());

        Ok(Self {
            host: env::var("ENGINE_HOST").unwrap_or_else(|_| "localhost".into()),
            port: env::var("ENGINE_PORT")
                .unwrap_or_else(|_| "3001".into())
                .parse()
                .map_err(|_| {
                    StartupError::Config("ENGINE_PORT must be a valid port number".into())
                })?,
            db_path,
            hmac_secret,
            hmac_max_skew_secs: env::var("ENGINE_HMAC_MAX_SKEW_SECS")
                .unwrap_or_else(|_| "60".into())
                .parse()
                .map_err(|_| {
                    StartupError::Config("ENGINE_HMAC_MAX_SKEW_SECS must be an integer".into())
                })?,
            rate_limit_per_ip: env::var("ENGINE_RATE_LIMIT_PER_IP")
                .unwrap_or_else(|_| "120".into())
                .parse()
                .map_err(|_| {
                    StartupError::Config("ENGINE_RATE_LIMIT_PER_IP must be an integer".into())
                })?,
            max_limit: env::var("ENGINE_MAX_LIMIT")
                .unwrap_or_else(|_| "100".into())
                .parse()
                .map_err(|_| StartupError::Config("ENGINE_MAX_LIMIT must be an integer".into()))?,
        })
    }
}
