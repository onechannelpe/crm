use pipeline::gate::run_gate;
use pipeline::promote::promote_db;
use pipeline::storage::schema::init_schema;
use tempfile::tempdir;

mod common;

#[test]
fn gate_reads_latest_snapshot_even_when_materialized() {
    let temporary_directory = tempdir().expect("create tempdir");
    let database_path = temporary_directory.path().join("stage.sqlite");
    let database_path_string = database_path.to_string_lossy().to_string();
    init_schema(&database_path_string).expect("init schema");

    common::seed_minimal_gate_ready_state(&database_path_string);

    let gate_result = run_gate(&database_path_string).expect("run gate");
    assert!(gate_result.passed);
    assert!(
        gate_result
            .checks
            .iter()
            .any(|check| check.name == "sunat.accepted_rows_gt_0")
    );
    assert!(
        gate_result
            .checks
            .iter()
            .any(|check| check.name == "sunat.invalid_doc_ratio")
    );
}

#[test]
fn promote_keeps_previous_db_as_backup() {
    let temporary_directory = tempdir().expect("create tempdir");
    let from_path = temporary_directory.path().join("from.sqlite");
    let to_path = temporary_directory.path().join("engine.sqlite");
    let from_path_string = from_path.to_string_lossy().to_string();
    let to_path_string = to_path.to_string_lossy().to_string();

    init_schema(&from_path_string).expect("init from schema");
    init_schema(&to_path_string).expect("init to schema");

    promote_db(&from_path_string, &to_path_string).expect("promote");

    let backup_path = format!("{to_path_string}.prev");
    assert!(std::path::Path::new(&to_path_string).exists());
    assert!(std::path::Path::new(&backup_path).exists());
}
