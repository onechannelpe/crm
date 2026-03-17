use rusqlite::Connection;

/// Creates a seeded temp SQLite file with the search schema for engine-level tests.
#[allow(dead_code)]
pub fn create_test_db() -> tempfile::NamedTempFile {
    let file = tempfile::NamedTempFile::new().expect("temp file");
    let conn = Connection::open(file.path()).expect("open sqlite");
    conn.execute_batch(
        "
        CREATE TABLE search_projection (
            id INTEGER PRIMARY KEY,
            dni TEXT NOT NULL,
            name TEXT,
            birth_date TEXT,
            birth_place TEXT,
            sex TEXT,
            marital_status TEXT,
            location_text TEXT,
            ubigeo_code TEXT,
            mother_name TEXT,
            father_name TEXT,
            email TEXT,
            person_ruc TEXT,
            org_ruc TEXT,
            org_name TEXT,
            trade_name TEXT,
            company_type TEXT,
            org_status TEXT,
            org_condition TEXT,
            fiscal_address TEXT,
            registration_date TEXT,
            activity_start_date TEXT,
            line_of_business TEXT,
            economic_activity TEXT,
            org_ubigeo_code TEXT,
            org_department TEXT,
            org_province TEXT,
            org_district TEXT,
            role_name TEXT,
            role_start_date TEXT,
            rep_doc_type TEXT,
            rep_doc_number TEXT,
            rep_name TEXT,
            phone_primary TEXT,
            phone_secondary TEXT
        );
        CREATE TABLE search_projection_phone_index (
            phone TEXT NOT NULL,
            projection_id INTEGER NOT NULL
        );
        CREATE VIRTUAL TABLE search_projection_fts USING fts5(person_name, company_name);
        CREATE TABLE ruc_phone_agg (org_ruc TEXT PRIMARY KEY, phones TEXT NOT NULL);
        CREATE TABLE dni_phone_agg (dni TEXT PRIMARY KEY, phones TEXT NOT NULL);
        ",
    )
    .expect("seed db");
    file
}
