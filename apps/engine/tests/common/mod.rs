use hmac::{Hmac, Mac};
use rusqlite::Connection;
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};

#[allow(dead_code)]
type HmacSha256 = Hmac<Sha256>;

pub fn create_test_db() -> tempfile::NamedTempFile {
    let file = tempfile::NamedTempFile::new().expect("temp file");
    let conn = Connection::open(file.path()).expect("open sqlite");
    conn.execute_batch(
        "
        CREATE TABLE person_profile (
            person_id INTEGER PRIMARY KEY,
            dni TEXT UNIQUE,
            natural_ruc10 TEXT UNIQUE,
            full_name TEXT NOT NULL DEFAULT '',
            birth_date TEXT,
            birth_place TEXT,
            sex TEXT,
            marital_status TEXT,
            location_text TEXT,
            mother_name TEXT,
            father_name TEXT,
            email TEXT,
            ubigeo_code TEXT
        );
        CREATE TABLE company_profile (
            company_id INTEGER PRIMARY KEY,
            ruc TEXT NOT NULL UNIQUE,
            legal_name TEXT NOT NULL DEFAULT '',
            trade_name TEXT,
            registration_date TEXT,
            activity_start_date TEXT,
            fiscal_address TEXT,
            company_type TEXT,
            line_of_business TEXT,
            status TEXT,
            condition TEXT,
            economic_activity TEXT
        );
        CREATE TABLE person_company_role (
            role_id INTEGER PRIMARY KEY,
            person_id INTEGER,
            company_id INTEGER NOT NULL,
            rep_doc_type TEXT NOT NULL DEFAULT '',
            rep_doc_number TEXT NOT NULL DEFAULT '',
            rep_name TEXT NOT NULL DEFAULT '',
            role_name TEXT NOT NULL DEFAULT '',
            role_start_date TEXT NOT NULL DEFAULT '',
            resolution_status TEXT NOT NULL DEFAULT 'unresolved'
        );
        CREATE TABLE contacts_serving (
            id INTEGER PRIMARY KEY,
            dni TEXT NOT NULL,
            name TEXT,
            org_ruc TEXT,
            org_name TEXT,
            phone_primary TEXT,
            phone_secondary TEXT
        );
        CREATE TABLE phone_index (phone TEXT NOT NULL, contact_id INTEGER NOT NULL);
        CREATE TABLE ruc_phone_agg (org_ruc TEXT PRIMARY KEY, phones TEXT NOT NULL);
        CREATE TABLE dni_phone_agg (dni TEXT PRIMARY KEY, phones TEXT NOT NULL);
        CREATE VIRTUAL TABLE contacts_fts USING fts5(person_name, company_name);

        INSERT INTO person_profile(person_id,dni,full_name,sex,birth_date) VALUES
          (1,'12345678','JUAN PEREZ','M','1980-05-10'),
          (2,'87654321','MARIA LOPEZ','F',NULL),
          (3,'11223344','CARLOS DIAZ',NULL,NULL);

        INSERT INTO company_profile(company_id,ruc,legal_name,trade_name,status,fiscal_address) VALUES
          (1,'20100011111','ACME SAC','ACME','ACTIVO','AV. LIMA 123');

        INSERT INTO person_company_role(role_id,person_id,company_id,role_name,role_start_date) VALUES
          (1,1,1,'GERENTE GENERAL','2020-01-01'),
          (2,2,1,'SOCIO','2020-01-01');

        INSERT INTO contacts_serving(id,dni,name,org_ruc,org_name,phone_primary,phone_secondary) VALUES
          (1,'12345678','JUAN PEREZ','20100011111','ACME SAC','999111222','999333444'),
          (2,'87654321','MARIA LOPEZ','20100011111','ACME SAC','988777666',NULL),
          (3,'11223344','CARLOS DIAZ','','','977000111',NULL);

        INSERT INTO phone_index(phone, contact_id) VALUES
          ('999111222',1),('999333444',1),('988777666',2),('977000111',3);

        INSERT INTO ruc_phone_agg(org_ruc, phones) VALUES
          ('20100011111','999111222;999333444;988777666');
        INSERT INTO dni_phone_agg(dni, phones) VALUES
          ('12345678','999111222;999333444'),
          ('87654321','988777666'),
          ('11223344','977000111');

        INSERT INTO contacts_fts(rowid, person_name, company_name)
        SELECT id, COALESCE(name,''), COALESCE(org_name,'') FROM contacts_serving;
        ",
    )
    .expect("seed db");
    file
}

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
