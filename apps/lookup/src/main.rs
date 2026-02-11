mod api;
mod auth;
mod config;
mod data;
mod errors;
mod index;
mod rate_limit;
mod service;
mod types;

use config::Config;
use service::SearcherService;
use std::sync::Arc;
use tracing::info;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("crm_searcher=info".parse()?),
        )
        .init();

    info!("apps/lookup is starting...");

    let config = Config::from_env()?;
    let service = Arc::new(SearcherService::new(&config.data_path).await?);
    
    api::start_server(service, config).await?;

    Ok(())
}
