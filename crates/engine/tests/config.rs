use crm_engine::config::{ConnectMode, EngineConfig};
use std::sync::{Mutex, OnceLock};

fn env_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

fn reset_config_env() {
    unsafe {
        std::env::set_var("ENGINE_HMAC_KEYS_JSON", r#"{"web":"secret"}"#);
        std::env::set_var("ENGINE_CONTACTS_DB_PATH", "/tmp/contacts.sqlite");
        std::env::set_var("ENGINE_LEADS_DB_PATH", "/tmp/leads.sqlite");
        std::env::remove_var("ENGINE_CONNECT_MODE");
        std::env::remove_var("ENGINE_HOST");
        std::env::remove_var("ENGINE_PORT");
        std::env::remove_var("ENGINE_HMAC_MAX_SKEW_SECS");
        std::env::remove_var("ENGINE_RATE_LIMIT_PER_KEY");
        std::env::remove_var("ENGINE_MAX_LIMIT");
    }
}

#[test]
fn local_mode_defaults_to_loopback_bind() {
    let _guard = env_lock().lock().expect("env lock");
    reset_config_env();

    let config = EngineConfig::load().expect("config");

    assert_eq!(config.connect_mode, ConnectMode::Local);
    assert_eq!(config.host, "127.0.0.1");
    assert_eq!(config.port, 3001);
}

#[test]
fn local_mode_rejects_public_bind_hosts() {
    let _guard = env_lock().lock().expect("env lock");
    reset_config_env();
    unsafe {
        std::env::set_var("ENGINE_HOST", "0.0.0.0");
    }

    let error = EngineConfig::load().expect_err("config should fail");

    assert_eq!(
        error.to_string(),
        "configuration error: ENGINE_HOST must bind to loopback in local mode"
    );
}

#[test]
fn remote_mode_allows_non_loopback_bind_hosts() {
    let _guard = env_lock().lock().expect("env lock");
    reset_config_env();
    unsafe {
        std::env::set_var("ENGINE_CONNECT_MODE", "remote");
        std::env::set_var("ENGINE_HOST", "0.0.0.0");
    }

    let config = EngineConfig::load().expect("config");

    assert_eq!(config.connect_mode, ConnectMode::Remote);
    assert_eq!(config.host, "0.0.0.0");
}

#[test]
fn rejects_invalid_connect_mode() {
    let _guard = env_lock().lock().expect("env lock");
    reset_config_env();
    unsafe {
        std::env::set_var("ENGINE_CONNECT_MODE", "invalid");
    }

    let error = EngineConfig::load().expect_err("config should fail");

    assert_eq!(
        error.to_string(),
        "configuration error: ENGINE_CONNECT_MODE must be one of: local, remote"
    );
}
