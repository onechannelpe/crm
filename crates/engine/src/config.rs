use engine_infra::error::StartupError;
use std::collections::HashMap;
use std::env;
use std::net::IpAddr;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConnectMode {
    Local,
    Remote,
}

#[derive(Debug, Clone)]
pub struct EngineConfig {
    pub connect_mode: ConnectMode,
    pub host: String,
    pub port: u16,
    pub contacts_db_path: String,
    pub leads_db_path: String,
    pub hmac_keys: HashMap<String, String>,
    pub hmac_max_skew_secs: i64,
    pub rate_limit_per_key: u32,
    pub max_limit: usize,
}

impl EngineConfig {
    pub fn load() -> Result<Self, StartupError> {
        let connect_mode = match env::var("ENGINE_CONNECT_MODE")
            .unwrap_or_else(|_| "local".into())
            .as_str()
        {
            "local" => ConnectMode::Local,
            "remote" => ConnectMode::Remote,
            _ => {
                return Err(StartupError::Config(
                    "ENGINE_CONNECT_MODE must be one of: local, remote".into(),
                ));
            }
        };

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
            .any(|(k, v)| k.trim().is_empty() || v.trim().is_empty())
        {
            return Err(StartupError::Config(
                "ENGINE_HMAC_KEYS_JSON keys and secrets must be non-empty".into(),
            ));
        }

        let contacts_db_path = env::var("ENGINE_CONTACTS_DB_PATH")
            .map_err(|_| StartupError::Config("ENGINE_CONTACTS_DB_PATH is required".into()))?;
        let leads_db_path = env::var("ENGINE_LEADS_DB_PATH")
            .map_err(|_| StartupError::Config("ENGINE_LEADS_DB_PATH is required".into()))?;

        let host = env::var("ENGINE_HOST").unwrap_or_else(|_| "127.0.0.1".into());
        if connect_mode == ConnectMode::Local && !is_loopback_host(&host) {
            return Err(StartupError::Config(
                "ENGINE_HOST must bind to loopback in local mode".into(),
            ));
        }

        Ok(Self {
            connect_mode,
            host,
            port: env::var("ENGINE_PORT")
                .unwrap_or_else(|_| "3001".into())
                .parse()
                .map_err(|_| {
                    StartupError::Config("ENGINE_PORT must be a valid port number".into())
                })?,
            contacts_db_path,
            leads_db_path,
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

fn is_loopback_host(host: &str) -> bool {
    if host == "localhost" {
        return true;
    }
    host.parse::<IpAddr>().is_ok_and(|addr| addr.is_loopback())
}
