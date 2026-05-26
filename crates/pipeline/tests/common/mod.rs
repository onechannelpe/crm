use crm_pipeline::db::schema::open_rw;
use rusqlite::params;

pub fn seed_minimal_gate_ready_state(db_path: &str) {
    let connection = open_rw(db_path).expect("open db");
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
            "INSERT INTO document(doc_id, doc_type, doc_number) VALUES (?1, ?2, ?3)",
            params![1_i64, "DNI", "12345678"],
        )
        .expect("insert document row");
    connection
        .execute(
            "INSERT INTO doc_projection(doc_id, doc_type, doc_number) VALUES (?1, ?2, ?3)",
            params![1_i64, "DNI", "12345678"],
        )
        .expect("insert doc projection row");
    connection
        .execute(
            "INSERT INTO company_profile(company_id, ruc, legal_name) VALUES (?1, ?2, ?3)",
            params![1_i64, "20100011111", "ACME S.A.C."],
        )
        .expect("insert company profile row");
    connection
        .execute(
            "INSERT INTO company_projection(company_id, ruc) VALUES (?1, ?2)",
            params![1_i64, "20100011111"],
        )
        .expect("insert company projection row");
    connection
        .execute(
            "INSERT INTO doc_projection_phone_index(phone, doc_id) VALUES (?1, ?2)",
            params!["999111222", 1_i64],
        )
        .expect("insert doc phone index row");
    connection
        .execute(
            "INSERT INTO company_projection_phone_index(phone, company_id) VALUES (?1, ?2)",
            params!["999111222", 1_i64],
        )
        .expect("insert company phone index row");
}
