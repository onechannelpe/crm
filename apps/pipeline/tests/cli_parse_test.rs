use crm_pipeline::cli::{Command, parse_args};

#[test]
fn parses_bench_with_default_profile() {
    let args = vec!["bench".to_owned()];
    let command = parse_args(&args).expect("parse should succeed");
    assert!(matches!(command, Command::Bench { .. }));
}

#[test]
fn parses_refresh_with_default_slice() {
    let args = vec!["refresh".to_owned()];
    let command = parse_args(&args).expect("parse should succeed");
    assert!(matches!(command, Command::Refresh { .. }));
}
