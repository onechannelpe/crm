use crate::error::StartupError;
use std::env;

pub struct Config {
    pub host: String,
    pub port: u16,
    pub data_path: String,
    pub hmac_secret: String,
    pub rate_limit_per_ip: u32,
}

impl Config {
    pub fn load() -> Result<Self, StartupError> {
        let hmac_secret = env::var("HMAC_SECRET")
            .map_err(|_| StartupError::Config("HMAC_SECRET is required".into()))?;

        Ok(Self {
            host: env::var("HOST").unwrap_or_else(|_| "127.0.0.1".into()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "3001".into())
                .parse()
                .unwrap_or(3001),
            data_path: env::var("DATA_PATH")
                .unwrap_or_else(|_| "./data/contacts.csv".into()),
            hmac_secret,
            rate_limit_per_ip: env::var("RATE_LIMIT_PER_IP")
                .unwrap_or_else(|_| "120".into())
                .parse()
                .unwrap_or(120),
        })
    }
}
