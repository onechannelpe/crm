use std::env;

pub struct Config {
    pub host: String,
    pub port: String,
    pub data_path: String,
    pub api_keys: Vec<String>,
    pub rate_limit_per_minute: u32,
}

impl Config {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        let api_keys_str = env::var("API_KEYS")
            .map_err(|_| "API_KEYS environment variable required")?;
        
        let api_keys: Vec<String> = api_keys_str
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        
        if api_keys.is_empty() {
            return Err("At least one API key required".into());
        }
        
        Ok(Self {
            host: env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            port: env::var("PORT").unwrap_or_else(|_| "5000".to_string()),
            data_path: env::var("DATA_PATH")
                .unwrap_or_else(|_| "./data/contacts.csv".to_string()),
            api_keys,
            rate_limit_per_minute: env::var("RATE_LIMIT_PER_MINUTE")
                .unwrap_or_else(|_| "60".to_string())
                .parse()
                .unwrap_or(60),
        })
    }
}
