mod api;
mod config;
mod data;
mod error;
mod middleware;
mod service;

use config::Config;
use error::Result;
use service::LeadService;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    dotenvy::dotenv().ok();

    let config = Config::load()?;
    let service = LeadService::new(&config.data_path, config.default_daily_quota).await?;

    api::serve(service, config).await
}
