mod api;
mod config;
mod csv_loader;
mod error;
mod hmac_auth;
mod rate_limit;
mod search;
mod search_index;
mod types;
mod validation;

use config::Config;
use std::path::Path;

fn load_root_env() {
    let env_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../.env");
    let _ = dotenvy::from_path(env_path);
}

#[tokio::main]
async fn main() -> Result<(), error::StartupError> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    load_root_env();

    let config = Config::load()?;
    let records = csv_loader::load(&config.data_path)?;
    let index = search_index::SearchIndex::build(&records);

    tracing::info!("loaded {} records, starting server", records.len());

    api::serve(index, config).await
}
