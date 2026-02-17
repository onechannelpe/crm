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
        CREATE TABLE contacts (
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

        INSERT INTO contacts(id,dni,name,org_ruc,org_name,phone_primary,phone_secondary) VALUES
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
        SELECT id, COALESCE(name,''), COALESCE(org_name,'') FROM contacts;
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
