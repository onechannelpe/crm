use shared::error::StartupError;
use std::collections::HashMap;
use std::env;
use std::net::IpAddr;

const DEFAULT_ENGINE_HOST: &str = "127.0.0.1";
const DEFAULT_ENGINE_PORT: u16 = 3001;
const DEFAULT_CONTACTS_DB_PATH: &str = "crates/engine/data/contacts.sqlite";
const DEFAULT_LEADS_DB_PATH: &str = "crates/engine/data/leads.sqlite";
const DEFAULT_HMAC_MAX_SKEW_SECS: i64 = 60;
const DEFAULT_RATE_LIMIT_PER_KEY: u32 = 600;
const DEFAULT_MAX_LIMIT: usize = 100;

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
        let env = Env;
        let connect_mode = parse_connect_mode(&env.string("ENGINE_CONNECT_MODE", "local"))?;

        let hmac_keys = parse_hmac_keys(&env.require("ENGINE_HMAC_KEYS_JSON")?)?;

        let contacts_db_path = env.string("ENGINE_CONTACTS_DB_PATH", DEFAULT_CONTACTS_DB_PATH);
        let leads_db_path = env.string("ENGINE_LEADS_DB_PATH", DEFAULT_LEADS_DB_PATH);

        let host = env.string("ENGINE_HOST", DEFAULT_ENGINE_HOST);
        if connect_mode == ConnectMode::Local && !is_loopback(&host) {
            return Err(StartupError::Config(
                "ENGINE_HOST must bind to loopback in local mode".into(),
            ));
        }

        Ok(Self {
            connect_mode,
            host,
            port: env.int("ENGINE_PORT", DEFAULT_ENGINE_PORT)?,
            contacts_db_path,
            leads_db_path,
            hmac_keys,
            hmac_max_skew_secs: env.int("ENGINE_HMAC_MAX_SKEW_SECS", DEFAULT_HMAC_MAX_SKEW_SECS)?,
            rate_limit_per_key: env.int("ENGINE_RATE_LIMIT_PER_KEY", DEFAULT_RATE_LIMIT_PER_KEY)?,
            max_limit: env.int("ENGINE_MAX_LIMIT", DEFAULT_MAX_LIMIT)?,
        })
    }
}

// private helpers

#[derive(Debug, Default, Clone, Copy)]
struct Env;

impl Env {
    fn require(&self, name: &str) -> Result<String, StartupError> {
        env::var(name).map_err(|_| StartupError::Config(format!("{name} is required")))
    }

    fn string(&self, name: &str, default: &str) -> String {
        env::var(name).unwrap_or_else(|_| default.into())
    }

    fn int<T>(&self, name: &str, default: T) -> Result<T, StartupError>
    where
        T: std::str::FromStr + ToString,
    {
        match env::var(name) {
            Err(_) => Ok(default),
            Ok(v) => v.parse().map_err(|_| {
                StartupError::Config(format!("{name} must be a valid number, got: {v}"))
            }),
        }
    }
}

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

fn is_loopback(host: &str) -> bool {
    if host == "localhost" {
        return true;
    }
    host.parse::<IpAddr>().is_ok_and(|a| a.is_loopback())
}
