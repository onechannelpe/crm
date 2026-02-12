use crate::error::{Error, Result};
use std::env;

pub struct Config {
    pub host: String,
    pub port: u16,
    pub data_path: String,
    pub api_keys: Vec<String>,
    pub rate_limit_per_minute: u32,
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
        })
    }

    fn parse_api_keys() -> Result<Vec<String>> {
        let keys_str = env::var("API_KEYS").map_err(|_| Error::Data("API_KEYS required".into()))?;

        let keys: Vec<String> = keys_str
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        if keys.is_empty() {
            return Err(Error::Data("at least one API key required".into()));
        }

        Ok(keys)
    }
}
