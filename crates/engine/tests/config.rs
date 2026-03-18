use engine::config::{ConnectMode, EngineConfig};
use std::sync::{Mutex, OnceLock};

/// Env vars are process-global state, so all config tests share a mutex to
/// prevent races when running in parallel.
fn env_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

fn set_required_env() {
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

// ── connect mode ──────────────────────────────────────────────────────────────

#[test]
fn local_mode_is_the_default() {
    let _g = env_lock().lock().unwrap();
    set_required_env();

    let cfg = EngineConfig::load().expect("config");
    assert_eq!(cfg.connect_mode, ConnectMode::Local);
}

#[test]
fn local_mode_defaults_to_loopback_host_and_port_3001() {
    let _g = env_lock().lock().unwrap();
    set_required_env();

    let cfg = EngineConfig::load().expect("config");
    assert_eq!(cfg.host, "127.0.0.1");
    assert_eq!(cfg.port, 3001);
}

#[test]
fn local_mode_rejects_public_bind_host() {
    let _g = env_lock().lock().unwrap();
    set_required_env();
    unsafe {
        std::env::set_var("ENGINE_HOST", "0.0.0.0");
    }

    let err = EngineConfig::load().expect_err("should fail");
    assert_eq!(
        err.to_string(),
        "configuration error: ENGINE_HOST must bind to loopback in local mode"
    );
}

#[test]
fn remote_mode_allows_non_loopback_host() {
    let _g = env_lock().lock().unwrap();
    set_required_env();
    unsafe {
        std::env::set_var("ENGINE_CONNECT_MODE", "remote");
        std::env::set_var("ENGINE_HOST", "0.0.0.0");
    }

    let cfg = EngineConfig::load().expect("config");
    assert_eq!(cfg.connect_mode, ConnectMode::Remote);
    assert_eq!(cfg.host, "0.0.0.0");
}

#[test]
fn invalid_connect_mode_is_rejected() {
    let _g = env_lock().lock().unwrap();
    set_required_env();
    unsafe {
        std::env::set_var("ENGINE_CONNECT_MODE", "invalid");
    }

    let err = EngineConfig::load().expect_err("should fail");
    assert_eq!(
        err.to_string(),
        "configuration error: ENGINE_CONNECT_MODE must be one of: local, remote"
    );
}

// ── HMAC keys ─────────────────────────────────────────────────────────────────

#[test]
fn empty_hmac_keys_object_is_rejected() {
    let _g = env_lock().lock().unwrap();
    set_required_env();
    unsafe {
        std::env::set_var("ENGINE_HMAC_KEYS_JSON", "{}");
    }

    let err = EngineConfig::load().expect_err("should fail");
    assert!(err.to_string().contains("at least one key"));
}

#[test]
fn malformed_hmac_keys_json_is_rejected() {
    let _g = env_lock().lock().unwrap();
    set_required_env();
    unsafe {
        std::env::set_var("ENGINE_HMAC_KEYS_JSON", "not-json");
    }

    let err = EngineConfig::load().expect_err("should fail");
    assert!(err.to_string().contains("JSON object"));
}

#[test]
fn hmac_key_with_empty_secret_is_rejected() {
    let _g = env_lock().lock().unwrap();
    set_required_env();
    unsafe {
        std::env::set_var("ENGINE_HMAC_KEYS_JSON", r#"{"web":""}"#);
    }

    let err = EngineConfig::load().expect_err("should fail");
    assert!(err.to_string().contains("non-empty"));
}

// ── numeric env vars ──────────────────────────────────────────────────────────

#[test]
fn non_numeric_port_is_rejected() {
    let _g = env_lock().lock().unwrap();
    set_required_env();
    unsafe {
        std::env::set_var("ENGINE_PORT", "abc");
    }

    let err = EngineConfig::load().expect_err("should fail");
    assert!(err.to_string().contains("ENGINE_PORT"));
}

#[test]
fn custom_port_is_respected() {
    let _g = env_lock().lock().unwrap();
    set_required_env();
    unsafe {
        std::env::set_var("ENGINE_PORT", "8080");
    }

    let cfg = EngineConfig::load().expect("config");
    assert_eq!(cfg.port, 8080);
}
