use engine::config::{ConnectMode, EngineConfig};
use std::sync::{Mutex, OnceLock};

/// Env vars are process-global state, so all config tests share a mutex to
/// prevent races when running in parallel.
fn env_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

fn set_env(name: &str, value: &str) {
    unsafe {
        std::env::set_var(name, value);
    }
}

fn remove_env(name: &str) {
    unsafe {
        std::env::remove_var(name);
    }
}

fn set_base_env() {
    set_env("ENGINE_HMAC_KEYS_JSON", r#"{"web":"secret"}"#);

    for name in [
        "ENGINE_CONTACTS_DB_PATH",
        "ENGINE_LEADS_DB_PATH",
        "ENGINE_CONNECT_MODE",
        "ENGINE_HOST",
        "ENGINE_PORT",
        "ENGINE_HMAC_MAX_SKEW_SECS",
        "ENGINE_RATE_LIMIT_PER_KEY",
        "ENGINE_MAX_LIMIT",
    ] {
        remove_env(name);
    }
}

// base load and db paths

#[test]
fn config_loads_with_minimal_required_env() {
    let _g = env_lock().lock().unwrap();
    set_base_env();

    let _cfg = EngineConfig::load().expect("config should load with minimal required env");
}

#[test]
fn explicit_db_paths_override_defaults() {
    let _g = env_lock().lock().unwrap();
    set_base_env();
    set_env("ENGINE_CONTACTS_DB_PATH", "/tmp/override-contacts.sqlite");
    set_env("ENGINE_LEADS_DB_PATH", "/tmp/override-leads.sqlite");

    let cfg = EngineConfig::load().expect("config");
    assert_eq!(cfg.contacts_db_path, "/tmp/override-contacts.sqlite");
    assert_eq!(cfg.leads_db_path, "/tmp/override-leads.sqlite");
}

// connect mode

#[test]
fn local_mode_is_the_default() {
    let _g = env_lock().lock().unwrap();
    set_base_env();

    let cfg = EngineConfig::load().expect("config");
    assert_eq!(cfg.connect_mode, ConnectMode::Local);
}

#[test]
fn local_mode_defaults_to_loopback_host_and_port_3001() {
    let _g = env_lock().lock().unwrap();
    set_base_env();

    let cfg = EngineConfig::load().expect("config");
    assert_eq!(cfg.host, "127.0.0.1");
    assert_eq!(cfg.port, 3001);
}

#[test]
fn local_mode_rejects_public_bind_host() {
    let _g = env_lock().lock().unwrap();
    set_base_env();
    set_env("ENGINE_HOST", "0.0.0.0");

    let err = EngineConfig::load().expect_err("should fail");
    assert_eq!(
        err.to_string(),
        "configuration error: ENGINE_HOST must bind to loopback in local mode"
    );
}

#[test]
fn remote_mode_allows_non_loopback_host() {
    let _g = env_lock().lock().unwrap();
    set_base_env();
    set_env("ENGINE_CONNECT_MODE", "remote");
    set_env("ENGINE_HOST", "0.0.0.0");

    let cfg = EngineConfig::load().expect("config");
    assert_eq!(cfg.connect_mode, ConnectMode::Remote);
    assert_eq!(cfg.host, "0.0.0.0");
}

#[test]
fn invalid_connect_mode_is_rejected() {
    let _g = env_lock().lock().unwrap();
    set_base_env();
    set_env("ENGINE_CONNECT_MODE", "invalid");

    let err = EngineConfig::load().expect_err("should fail");
    assert_eq!(
        err.to_string(),
        "configuration error: ENGINE_CONNECT_MODE must be one of: local, remote"
    );
}

// hmac keys

#[test]
fn empty_hmac_keys_object_is_rejected() {
    let _g = env_lock().lock().unwrap();
    set_base_env();
    set_env("ENGINE_HMAC_KEYS_JSON", "{}");

    let err = EngineConfig::load().expect_err("should fail");
    assert!(err.to_string().contains("at least one key"));
}

#[test]
fn malformed_hmac_keys_json_is_rejected() {
    let _g = env_lock().lock().unwrap();
    set_base_env();
    set_env("ENGINE_HMAC_KEYS_JSON", "not-json");

    let err = EngineConfig::load().expect_err("should fail");
    assert!(err.to_string().contains("JSON object"));
}

#[test]
fn hmac_key_with_empty_secret_is_rejected() {
    let _g = env_lock().lock().unwrap();
    set_base_env();
    set_env("ENGINE_HMAC_KEYS_JSON", r#"{"web":""}"#);

    let err = EngineConfig::load().expect_err("should fail");
    assert!(err.to_string().contains("non-empty"));
}

// numeric env vars

#[test]
fn non_numeric_port_is_rejected() {
    let _g = env_lock().lock().unwrap();
    set_base_env();
    set_env("ENGINE_PORT", "abc");

    let err = EngineConfig::load().expect_err("should fail");
    assert!(err.to_string().contains("ENGINE_PORT"));
}

#[test]
fn custom_port_is_respected() {
    let _g = env_lock().lock().unwrap();
    set_base_env();
    set_env("ENGINE_PORT", "8080");

    let cfg = EngineConfig::load().expect("config");
    assert_eq!(cfg.port, 8080);
}
