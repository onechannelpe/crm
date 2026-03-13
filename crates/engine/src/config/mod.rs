use crate::errors::StartupError;
use std::collections::HashMap;
use std::env;
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub db_path: String,
    pub hmac_keys: HashMap<String, String>,
    pub hmac_max_skew_secs: i64,
    pub rate_limit_per_key: u32,
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
        let hmac_keys_raw = env::var("ENGINE_HMAC_KEYS_JSON")
            .map_err(|_| StartupError::Config("ENGINE_HMAC_KEYS_JSON is required".into()))?;
        let hmac_keys: HashMap<String, String> =
            serde_json::from_str(&hmac_keys_raw).map_err(|_| {
                StartupError::Config(
                    "ENGINE_HMAC_KEYS_JSON must be a JSON object: {\"key_id\":\"secret\"}".into(),
                )
            })?;
        if hmac_keys.is_empty() {
            return Err(StartupError::Config(
                "ENGINE_HMAC_KEYS_JSON must include at least one key".into(),
            ));
        }
        if hmac_keys
            .iter()
            .any(|(key_id, secret)| key_id.trim().is_empty() || secret.trim().is_empty())
        {
            return Err(StartupError::Config(
                "ENGINE_HMAC_KEYS_JSON keys and secrets must be non-empty".into(),
            ));
        }
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
            hmac_keys,
            hmac_max_skew_secs: env::var("ENGINE_HMAC_MAX_SKEW_SECS")
                .unwrap_or_else(|_| "60".into())
                .parse()
                .map_err(|_| {
                    StartupError::Config("ENGINE_HMAC_MAX_SKEW_SECS must be an integer".into())
                })?,
            rate_limit_per_key: env::var("ENGINE_RATE_LIMIT_PER_KEY")
                .unwrap_or_else(|_| "600".into())
                .parse()
                .map_err(|_| {
                    StartupError::Config("ENGINE_RATE_LIMIT_PER_KEY must be an integer".into())
                })?,
            max_limit: env::var("ENGINE_MAX_LIMIT")
                .unwrap_or_else(|_| "100".into())
                .parse()
                .map_err(|_| StartupError::Config("ENGINE_MAX_LIMIT must be an integer".into()))?,
        })
    }
}
