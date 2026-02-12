use crate::error::{Error, Result};
use crate::middleware::user::Role;
use std::env;

pub struct ApiKeyEntry {
    pub user_id: i64,
    pub role: Role,
}

pub struct Config {
    pub host: String,
    pub port: u16,
    pub data_path: String,
    pub api_keys: Vec<(String, ApiKeyEntry)>,
    pub rate_limit_per_minute: u32,
    pub default_daily_quota: u32,
}

impl Config {
    pub fn load() -> Result<Self> {
        let api_keys = Self::parse_api_keys()?;

        Ok(Self {
            host: env::var("HOST").unwrap_or_else(|_| "127.0.0.1".into()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "5000".into())
                .parse()
                .unwrap_or(5000),
            data_path: env::var("DATA_PATH").unwrap_or_else(|_| "./data/contacts.csv".into()),
            api_keys,
            rate_limit_per_minute: env::var("RATE_LIMIT_PER_MINUTE")
                .unwrap_or_else(|_| "60".into())
                .parse()
                .unwrap_or(60),
            default_daily_quota: env::var("DEFAULT_DAILY_QUOTA")
                .unwrap_or_else(|_| "100".into())
                .parse()
                .unwrap_or(100),
        })
    }

    fn parse_api_keys() -> Result<Vec<(String, ApiKeyEntry)>> {
        let keys_str = env::var("API_KEYS").map_err(|_| Error::Data("API_KEYS required".into()))?;

        let keys: Vec<(String, ApiKeyEntry)> = keys_str
            .split(',')
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(Self::parse_key_entry)
            .collect::<Result<_>>()?;

        if keys.is_empty() {
            return Err(Error::Data("at least one API key required".into()));
        }

        Ok(keys)
    }

    fn parse_key_entry(entry: &str) -> Result<(String, ApiKeyEntry)> {
        let parts: Vec<&str> = entry.split(':').collect();
        if parts.len() != 3 {
            return Err(Error::Data(
                "API_KEYS format: key:user_id:role (e.g., abc123:1001:executive)".into(),
            ));
        }

        let [key, user_id_str, role_str] = [parts[0], parts[1], parts[2]];

        let user_id = user_id_str
            .parse::<i64>()
            .map_err(|_| Error::Data("invalid user_id in API_KEYS".into()))?;

        let role = match role_str {
            "executive" => Role::Executive,
            "supervisor" => Role::Supervisor,
            "admin" => Role::Admin,
            _ => return Err(Error::Data("invalid role in API_KEYS".into())),
        };

        Ok((key.to_string(), ApiKeyEntry { user_id, role }))
    }
}
