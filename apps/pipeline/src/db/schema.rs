use crate::PipelineError;
use rusqlite::Connection;
use std::time::Duration;

pub fn init_schema(db_path: &str) -> Result<(), PipelineError> {
    let conn = open_rw(db_path)?;
    conn.execute_batch(
        r#"
        PRAGMA journal_mode=WAL;
        PRAGMA synchronous=NORMAL;
        PRAGMA temp_store=MEMORY;
        PRAGMA foreign_keys=ON;

        CREATE TABLE IF NOT EXISTS source_registry (
            source_id INTEGER PRIMARY KEY,
            source_key TEXT NOT NULL UNIQUE,
            source_name TEXT NOT NULL,
            reliability_rank INTEGER NOT NULL DEFAULT 100,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS source_snapshot (
            snapshot_id INTEGER PRIMARY KEY,
            source_id INTEGER NOT NULL,
            snapshot_label TEXT NOT NULL,
            snapshot_date TEXT NOT NULL,
            file_path TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'registered',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(source_id, snapshot_label),
            FOREIGN KEY(source_id) REFERENCES source_registry(source_id)
        );

        CREATE TABLE IF NOT EXISTS person_profile (
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

        CREATE TABLE IF NOT EXISTS company_profile (
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

        CREATE TABLE IF NOT EXISTS person_company_role (
            role_id INTEGER PRIMARY KEY,
            person_id INTEGER,
            company_id INTEGER NOT NULL,
            rep_doc_type TEXT NOT NULL DEFAULT '',
            rep_doc_number TEXT NOT NULL DEFAULT '',
            rep_name TEXT NOT NULL DEFAULT '',
            role_name TEXT NOT NULL DEFAULT '',
            role_start_date TEXT NOT NULL DEFAULT '',
            resolution_status TEXT NOT NULL DEFAULT 'unresolved',
            UNIQUE(company_id, rep_doc_type, rep_doc_number, role_name, role_start_date),
            FOREIGN KEY(person_id) REFERENCES person_profile(person_id),
            FOREIGN KEY(company_id) REFERENCES company_profile(company_id)
        );

        CREATE TABLE IF NOT EXISTS person_phone (
            person_id INTEGER NOT NULL,
            phone TEXT NOT NULL,
            first_seen_snapshot_id INTEGER NOT NULL,
            last_seen_snapshot_id INTEGER NOT NULL,
            confidence INTEGER NOT NULL DEFAULT 100,
            PRIMARY KEY(person_id, phone),
            FOREIGN KEY(person_id) REFERENCES person_profile(person_id)
        );

        CREATE TABLE IF NOT EXISTS company_phone (
            company_id INTEGER NOT NULL,
            phone TEXT NOT NULL,
            first_seen_snapshot_id INTEGER NOT NULL,
            last_seen_snapshot_id INTEGER NOT NULL,
            confidence INTEGER NOT NULL DEFAULT 100,
            PRIMARY KEY(company_id, phone),
            FOREIGN KEY(company_id) REFERENCES company_profile(company_id)
        );

        CREATE TABLE IF NOT EXISTS role_phone (
            role_id INTEGER NOT NULL,
            phone TEXT NOT NULL,
            first_seen_snapshot_id INTEGER NOT NULL,
            last_seen_snapshot_id INTEGER NOT NULL,
            confidence INTEGER NOT NULL DEFAULT 70,
            PRIMARY KEY(role_id, phone),
            FOREIGN KEY(role_id) REFERENCES person_company_role(role_id)
        );

        CREATE TABLE IF NOT EXISTS entity_evidence (
            evidence_id INTEGER PRIMARY KEY,
            entity_kind TEXT NOT NULL,
            entity_pk INTEGER NOT NULL,
            snapshot_id INTEGER NOT NULL,
            source_row_number INTEGER NOT NULL,
            raw_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(entity_kind, entity_pk, snapshot_id, source_row_number),
            FOREIGN KEY(snapshot_id) REFERENCES source_snapshot(snapshot_id)
        );

        CREATE TABLE IF NOT EXISTS snapshot_metrics (
            snapshot_id INTEGER PRIMARY KEY,
            total_rows INTEGER NOT NULL DEFAULT 0,
            accepted_rows INTEGER NOT NULL DEFAULT 0,
            invalid_dni_rows INTEGER NOT NULL DEFAULT 0,
            invalid_ruc_rows INTEGER NOT NULL DEFAULT 0,
            invalid_phone_rows INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(snapshot_id) REFERENCES source_snapshot(snapshot_id)
        );

        CREATE TABLE IF NOT EXISTS contacts_serving (
            id INTEGER PRIMARY KEY,
            dni TEXT NOT NULL,
            name TEXT,
            org_ruc TEXT,
            org_name TEXT,
            phone_primary TEXT,
            phone_secondary TEXT
        );

        CREATE TABLE IF NOT EXISTS phone_index (
            phone TEXT NOT NULL,
            contact_id INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ruc_phone_agg (
            org_ruc TEXT PRIMARY KEY,
            phones TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS dni_phone_agg (
            dni TEXT PRIMARY KEY,
            phones TEXT NOT NULL
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS contacts_fts USING fts5(
            person_name,
            company_name
        );
        "#,
    )?;

    Ok(())
}

pub fn open_rw(db_path: &str) -> Result<Connection, PipelineError> {
    let conn = Connection::open(db_path)?;
    conn.execute_batch(
        r#"
        PRAGMA journal_mode=WAL;
        PRAGMA synchronous=NORMAL;
        PRAGMA temp_store=MEMORY;
        PRAGMA cache_size=-262144;
        PRAGMA mmap_size=1073741824;
        PRAGMA wal_autocheckpoint=4000;
        PRAGMA foreign_keys=ON;
        "#,
    )?;
    conn.busy_timeout(Duration::from_secs(60))?;
    Ok(conn)
}
