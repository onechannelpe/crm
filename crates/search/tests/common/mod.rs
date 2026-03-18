use hmac::{Hmac, Mac};
use rusqlite::Connection;
use sha2::Sha256;
use shared::sqlite::{make_readonly_pool, SqlitePool};
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha256 = Hmac<Sha256>;

/// Creates a temp SQLite file seeded with the full search schema and sample rows.
#[allow(dead_code)]
pub fn create_test_db() -> tempfile::NamedTempFile {
    let file = tempfile::NamedTempFile::new().expect("temp file");
    let conn = Connection::open(file.path()).expect("open");
    conn.execute_batch(
        "
        CREATE TABLE search_projection (
            id                  INTEGER PRIMARY KEY,
            dni                 TEXT NOT NULL,
            name                TEXT,
            birth_date          TEXT,
            birth_place         TEXT,
            sex                 TEXT,
            marital_status      TEXT,
            location_text       TEXT,
            ubigeo_code         TEXT,
            mother_name         TEXT,
            father_name         TEXT,
            email               TEXT,
            person_ruc          TEXT,
            org_ruc             TEXT,
            org_name            TEXT,
            trade_name          TEXT,
            company_type        TEXT,
            org_status          TEXT,
            org_condition       TEXT,
            fiscal_address      TEXT,
            registration_date   TEXT,
            activity_start_date TEXT,
            line_of_business    TEXT,
            economic_activity   TEXT,
            org_ubigeo_code     TEXT,
            org_department      TEXT,
            org_province        TEXT,
            org_district        TEXT,
            role_name           TEXT,
            role_start_date     TEXT,
            rep_doc_type        TEXT,
            rep_doc_number      TEXT,
            rep_name            TEXT,
            phone_primary       TEXT,
            phone_secondary     TEXT
        );
        CREATE TABLE search_projection_phone_index (
            phone         TEXT    NOT NULL,
            projection_id INTEGER NOT NULL
        );
        CREATE VIRTUAL TABLE search_projection_fts USING fts5(person_name, company_name);
        CREATE TABLE ruc_phone_agg (org_ruc TEXT PRIMARY KEY, phones TEXT NOT NULL);
        CREATE TABLE dni_phone_agg (dni     TEXT PRIMARY KEY, phones TEXT NOT NULL);

        INSERT INTO search_projection(
            id, dni, name, birth_date, sex,
            org_ruc, org_name, trade_name, org_status, fiscal_address,
            role_name, role_start_date, rep_doc_type, rep_doc_number, rep_name,
            phone_primary, phone_secondary
        ) VALUES
            (1,'12345678','JUAN PEREZ','1980-05-10','M',
             '20100011111','ACME SAC','ACME','ACTIVO','AV. LIMA 123',
             'GERENTE GENERAL','2020-01-01','','','',
             '999111222','999333444'),
            (2,'87654321','MARIA LOPEZ',NULL,'F',
             '20100011111','ACME SAC','ACME','ACTIVO','AV. LIMA 123',
             'SOCIO','2020-01-01','','','',
             '988777666',NULL),
            (3,'11223344','CARLOS DIAZ',NULL,NULL,
             '','',NULL,NULL,NULL,
             NULL,NULL,'','','',
             '977000111',NULL);

        INSERT INTO search_projection_phone_index(phone, projection_id) VALUES
            ('999111222',1),('999333444',1),('988777666',2),('977000111',3);

        INSERT INTO ruc_phone_agg(org_ruc, phones) VALUES
            ('20100011111','999111222;999333444;988777666');

        INSERT INTO dni_phone_agg(dni, phones) VALUES
            ('12345678','999111222;999333444'),
            ('87654321','988777666'),
            ('11223344','977000111');

        INSERT INTO search_projection_fts(rowid, person_name, company_name)
        SELECT id, COALESCE(name,''), COALESCE(org_name,'') FROM search_projection;
        ",
    )
    .expect("seed db");
    file
}

/// Opens a read-only pool over a temp file.
#[allow(dead_code)]
pub fn test_pool(file: &tempfile::NamedTempFile) -> SqlitePool {
    make_readonly_pool(file.path().to_str().expect("path")).expect("pool")
}

/// Signs a body with the given secret. Returns `(timestamp_string, hex_signature)`.
#[allow(dead_code)]
pub fn sign(secret: &str, body: &[u8]) -> (String, String) {
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("time")
        .as_secs();
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).expect("hmac key");
    mac.update(&ts.to_be_bytes());
    mac.update(body);
    (ts.to_string(), hex::encode(mac.finalize().into_bytes()))
}
