use crm_engine::config::Config;
use std::path::Path;

fn load_root_env() {
    let env_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../.env");
    let _ = dotenvy::from_path(env_path);
}

#[tokio::main]
async fn main() -> Result<(), crm_engine::error::StartupError> {
    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));
    tracing_subscriber::fmt().with_env_filter(env_filter).init();

    load_root_env();

    let config = Config::load()?;
    let records = crm_engine::ingest::csv_mmap::load(&config.data_path)?;
    let index = crm_engine::index::store::SearchIndex::build(records);
    if index.by_ruc.is_empty() {
        return Err(crm_engine::error::StartupError::Config(
            "engine dataset contains zero RUC entries".into(),
        ));
    }

    tracing::info!("loaded {} records, starting server", index.record_count());

    crm_engine::api::serve(index, config).await
}
