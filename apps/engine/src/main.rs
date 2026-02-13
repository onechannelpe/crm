mod config;
mod csv_loader;
mod error;
mod hmac_auth;
mod rate_limit;
mod routes;
mod search;
mod search_index;
mod types;
mod validation;

use config::Config;

#[tokio::main]
async fn main() -> Result<(), error::StartupError> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    dotenvy::dotenv().ok();

    let config = Config::load()?;
    let records = csv_loader::load(&config.data_path)?;
    let index = search_index::SearchIndex::build(&records);

    tracing::info!("loaded {} records, starting server", records.len());

    routes::serve(index, config).await
}
