use crate::error::StartupError;
use std::env;
use std::path::PathBuf;

pub struct Config {
    pub host: String,
    pub port: u16,
    pub data_path: String,
    pub hmac_secret: String,
    pub rate_limit_per_ip: u32,
}

impl Config {
    fn default_data_path() -> String {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("data")
            .join("contacts.csv")
            .to_string_lossy()
            .into_owned()
    }

    pub fn load() -> Result<Self, StartupError> {
        let hmac_secret = env::var("ENGINE_HMAC_SECRET")
            .map_err(|_| StartupError::Config("ENGINE_HMAC_SECRET is required".into()))?;

        Ok(Self {
            host: env::var("HOST").unwrap_or_else(|_| "127.0.0.1".into()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "3001".into())
                .parse()
                .unwrap_or(3001),
            data_path: env::var("DATA_PATH").unwrap_or_else(|_| Self::default_data_path()),
            hmac_secret,
            rate_limit_per_ip: env::var("RATE_LIMIT_PER_IP")
                .unwrap_or_else(|_| "120".into())
                .parse()
                .unwrap_or(120),
        })
    }
}
