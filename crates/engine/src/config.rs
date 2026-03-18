use shared::error::StartupError;
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
        let connect_mode = parse_connect_mode(
            &env::var("ENGINE_CONNECT_MODE").unwrap_or_else(|_| "local".into()),
        )?;

        let hmac_keys = parse_hmac_keys(
            &env::var("ENGINE_HMAC_KEYS_JSON")
                .map_err(|_| StartupError::Config("ENGINE_HMAC_KEYS_JSON is required".into()))?,
        )?;

        let contacts_db_path = env::var("ENGINE_CONTACTS_DB_PATH")
            .map_err(|_| StartupError::Config("ENGINE_CONTACTS_DB_PATH is required".into()))?;
        let leads_db_path = env::var("ENGINE_LEADS_DB_PATH")
            .map_err(|_| StartupError::Config("ENGINE_LEADS_DB_PATH is required".into()))?;

        let host = env::var("ENGINE_HOST").unwrap_or_else(|_| "127.0.0.1".into());
        if connect_mode == ConnectMode::Local && !is_loopback(&host) {
            return Err(StartupError::Config(
                "ENGINE_HOST must bind to loopback in local mode".into(),
            ));
        }

        Ok(Self {
            connect_mode,
            host,
            port: parse_env_int("ENGINE_PORT", 3001)?,
            contacts_db_path,
            leads_db_path,
            hmac_keys,
            hmac_max_skew_secs: parse_env_int("ENGINE_HMAC_MAX_SKEW_SECS", 60)?,
            rate_limit_per_key: parse_env_int("ENGINE_RATE_LIMIT_PER_KEY", 600)?,
            max_limit: parse_env_int("ENGINE_MAX_LIMIT", 100)?,
        })
    }
}

// ── private helpers ───────────────────────────────────────────────────────────

fn parse_connect_mode(raw: &str) -> Result<ConnectMode, StartupError> {
    match raw {
        "local" => Ok(ConnectMode::Local),
        "remote" => Ok(ConnectMode::Remote),
        _ => Err(StartupError::Config(
            "ENGINE_CONNECT_MODE must be one of: local, remote".into(),
        )),
    }
}

fn parse_hmac_keys(raw: &str) -> Result<HashMap<String, String>, StartupError> {
    let keys: HashMap<String, String> = serde_json::from_str(raw).map_err(|_| {
        StartupError::Config(
            r#"ENGINE_HMAC_KEYS_JSON must be a JSON object: {"key_id":"secret"}"#.into(),
        )
    })?;
    if keys.is_empty() {
        return Err(StartupError::Config(
            "ENGINE_HMAC_KEYS_JSON must include at least one key".into(),
        ));
    }
    if keys
        .iter()
        .any(|(k, v)| k.trim().is_empty() || v.trim().is_empty())
    {
        return Err(StartupError::Config(
            "ENGINE_HMAC_KEYS_JSON keys and secrets must be non-empty".into(),
        ));
    }
    Ok(keys)
}

/// Reads an env var and parses it as `T`, falling back to `default` if unset.
fn parse_env_int<T>(name: &str, default: T) -> Result<T, StartupError>
where
    T: std::str::FromStr + ToString,
{
    match env::var(name) {
        Err(_) => Ok(default),
        Ok(v) => v
            .parse()
            .map_err(|_| StartupError::Config(format!("{name} must be a valid number, got: {v}"))),
    }
}

fn is_loopback(host: &str) -> bool {
    if host == "localhost" {
        return true;
    }
    host.parse::<IpAddr>().is_ok_and(|a| a.is_loopback())
}
