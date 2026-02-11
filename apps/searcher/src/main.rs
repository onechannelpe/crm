//! Phone Lookup API v2.0 - Modular Architecture
//! 
//! High-performance phone number lookup service.
//! Redesigned following simplicity and maintainability principles.

mod data;
mod errors;
mod handlers;
mod index;
mod server;
mod service;
mod types;

use server::{start_server, ServerConfig};
use service::PhoneLookupService;
use std::{env, sync::Arc};
use tracing::info;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize structured logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("phone_lookup_api=info".parse()?),
        )
        .init();

    info!("🚀 Phone Lookup API v2.0 starting...");

    // Load configuration
    let data_path = env::var("DATA_PATH")
        .unwrap_or_else(|_| "../integrated_phone_data.csv".to_string());
    
    let config = ServerConfig {
        host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
        port: env::var("PORT").unwrap_or_else(|_| "3000".to_string()),
    };

    // Initialize service (expensive but one-time)
    let service = Arc::new(PhoneLookupService::new(&data_path).await?);

    // Start HTTP server
    start_server(service, config).await?;

    Ok(())
}
