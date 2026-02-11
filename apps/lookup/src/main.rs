mod api;
mod config;
mod data;
mod error;
mod middleware;
mod service;

use config::Config;
use error::Result;
use service::LeadService;
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let config = Config::load()?;
    let service = Arc::new(LeadService::new(&config.data_path).await?);
    
    api::serve(service, config).await
}
