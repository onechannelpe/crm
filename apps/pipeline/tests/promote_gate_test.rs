use crm_pipeline::db::schema::{init_schema, open_rw};
use crm_pipeline::stages::gate::run_gate;
use crm_pipeline::stages::promote::promote_db;
use rusqlite::params;
use tempfile::tempdir;

#[test]
fn gate_reads_latest_snapshot_even_when_materialized() {
    let temporary_directory = tempdir().expect("create tempdir");
    let database_path = temporary_directory.path().join("stage.sqlite");
    let database_path_string = database_path.to_string_lossy().to_string();
    init_schema(&database_path_string).expect("init schema");

    let connection = open_rw(&database_path_string).expect("open db");
    connection
        .execute(
            "INSERT INTO source_registry(source_id, source_key, source_name, reliability_rank) VALUES (?1, ?2, ?3, ?4)",
            params![1_i64, "sunat", "sunat", 10_i64],
        )
        .expect("insert source");
    connection
        .execute(
            "INSERT INTO source_snapshot(snapshot_id, source_id, snapshot_label, snapshot_date, file_path, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                1_i64,
                1_i64,
                "sunat-2026-03",
                "2026-03-01",
                "/tmp/sunat.csv",
                "materialized"
            ],
        )
        .expect("insert snapshot");
    connection
        .execute(
            "INSERT INTO snapshot_metrics(snapshot_id, total_rows, accepted_rows, invalid_dni_rows, invalid_ruc_rows, invalid_phone_rows) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![1_i64, 100_i64, 95_i64, 2_i64, 0_i64, 0_i64],
        )
        .expect("insert metrics");
    connection
        .execute(
            "INSERT INTO search_projection(id, dni) VALUES (?1, ?2)",
            params![1_i64, "12345678"],
        )
        .expect("insert projection row");
    connection
        .execute(
            "INSERT INTO search_projection_phone_index(phone, projection_id) VALUES (?1, ?2)",
            params!["999111222", 1_i64],
        )
        .expect("insert phone index row");

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
            .any(|check| check.name == "sunat.invalid_dni_ratio")
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
