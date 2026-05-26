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

        -- Identity anchor: any valid (doc_type, doc_number) pair
        CREATE TABLE IF NOT EXISTS document (
            doc_id INTEGER PRIMARY KEY,
            doc_type TEXT NOT NULL,
            doc_number TEXT NOT NULL,
            UNIQUE(doc_type, doc_number)
        );

        -- Person attributes for a document holder
        CREATE TABLE IF NOT EXISTS document_attribute (
            doc_id INTEGER PRIMARY KEY,
            full_name TEXT NOT NULL DEFAULT '',
            birth_date TEXT,
            birth_place TEXT,
            sex TEXT,
            marital_status TEXT,
            location_text TEXT,
            mother_name TEXT,
            father_name TEXT,
            ubigeo_code TEXT,
            natural_ruc10 TEXT,
            FOREIGN KEY(doc_id) REFERENCES document(doc_id)
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
            ubigeo_code TEXT,
            department TEXT,
            province TEXT,
            district TEXT,
            economic_activity TEXT
        );

        -- Role links a document holder (nullable if unresolved) to a company
        CREATE TABLE IF NOT EXISTS company_role (
            role_id INTEGER PRIMARY KEY,
            company_id INTEGER NOT NULL,
            doc_id INTEGER,
            rep_doc_type TEXT NOT NULL DEFAULT '',
            rep_doc_number TEXT NOT NULL DEFAULT '',
            rep_name TEXT NOT NULL DEFAULT '',
            role_name TEXT NOT NULL DEFAULT '',
            role_start_date TEXT NOT NULL DEFAULT '',
            UNIQUE(company_id, rep_doc_type, rep_doc_number, role_name, role_start_date),
            FOREIGN KEY(company_id) REFERENCES company_profile(company_id),
            FOREIGN KEY(doc_id) REFERENCES document(doc_id)
        );

        -- Phones anchored to a document holder
        CREATE TABLE IF NOT EXISTS document_phone (
            doc_id INTEGER NOT NULL,
            phone TEXT NOT NULL,
            first_seen_snapshot_id INTEGER NOT NULL,
            last_seen_snapshot_id INTEGER NOT NULL,
            confidence INTEGER NOT NULL DEFAULT 100,
            PRIMARY KEY(doc_id, phone),
            FOREIGN KEY(doc_id) REFERENCES document(doc_id)
        );

        -- Emails anchored to a document holder
        CREATE TABLE IF NOT EXISTS document_email (
            doc_id INTEGER NOT NULL,
            email TEXT NOT NULL,
            source_id INTEGER NOT NULL,
            reliability INTEGER NOT NULL,
            PRIMARY KEY(doc_id, email),
            FOREIGN KEY(doc_id) REFERENCES document(doc_id),
            FOREIGN KEY(source_id) REFERENCES source_registry(source_id)
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

        CREATE TABLE IF NOT EXISTS snapshot_metrics (
            snapshot_id INTEGER PRIMARY KEY,
            total_rows INTEGER NOT NULL DEFAULT 0,
            accepted_rows INTEGER NOT NULL DEFAULT 0,
            invalid_doc_rows INTEGER NOT NULL DEFAULT 0,
            invalid_ruc_rows INTEGER NOT NULL DEFAULT 0,
            invalid_phone_rows INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(snapshot_id) REFERENCES source_snapshot(snapshot_id)
        );

        CREATE TABLE IF NOT EXISTS source_row_hash_latest (
            source_id INTEGER NOT NULL,
            source_row_number INTEGER NOT NULL,
            raw_hash TEXT NOT NULL,
            updated_snapshot_id INTEGER NOT NULL,
            PRIMARY KEY(source_id, source_row_number),
            FOREIGN KEY(source_id) REFERENCES source_registry(source_id),
            FOREIGN KEY(updated_snapshot_id) REFERENCES source_snapshot(snapshot_id)
        );

        -- Dirty tracking: independent per axis
        CREATE TABLE IF NOT EXISTS projection_dirty_doc (
            doc_id INTEGER PRIMARY KEY,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(doc_id) REFERENCES document(doc_id)
        );

        CREATE TABLE IF NOT EXISTS projection_dirty_company (
            company_id INTEGER PRIMARY KEY,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(company_id) REFERENCES company_profile(company_id)
        );

        -- Phone aggregates
        CREATE TABLE IF NOT EXISTS ruc_phone_agg (
            org_ruc TEXT PRIMARY KEY,
            phones TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS doc_phone_agg (
            doc_id INTEGER PRIMARY KEY,
            phones TEXT NOT NULL,
            FOREIGN KEY(doc_id) REFERENCES document(doc_id)
        );

        -- Person-centric search projection (one row per document)
        CREATE TABLE IF NOT EXISTS doc_projection (
            doc_id INTEGER PRIMARY KEY,
            doc_type TEXT NOT NULL,
            doc_number TEXT NOT NULL,
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
            phone_secondary TEXT,
            FOREIGN KEY(doc_id) REFERENCES document(doc_id)
        );

        -- Company-centric search projection (one row per company, always present)
        CREATE TABLE IF NOT EXISTS company_projection (
            company_id INTEGER PRIMARY KEY,
            ruc TEXT NOT NULL,
            legal_name TEXT,
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
            rep_doc_type TEXT,
            rep_doc_number TEXT,
            rep_name TEXT,
            role_name TEXT,
            role_start_date TEXT,
            phone_primary TEXT,
            phone_secondary TEXT,
            FOREIGN KEY(company_id) REFERENCES company_profile(company_id)
        );

        -- Phone lookup indexes for both projections
        CREATE TABLE IF NOT EXISTS doc_projection_phone_index (
            phone TEXT NOT NULL,
            doc_id INTEGER NOT NULL,
            UNIQUE(phone, doc_id)
        );

        CREATE TABLE IF NOT EXISTS company_projection_phone_index (
            phone TEXT NOT NULL,
            company_id INTEGER NOT NULL,
            UNIQUE(phone, company_id)
        );

        -- Full-text search indexes
        CREATE VIRTUAL TABLE IF NOT EXISTS doc_projection_fts USING fts5(
            doc_name,
            tokenize="unicode61 remove_diacritics 1"
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS company_projection_fts USING fts5(
            company_name,
            tokenize="unicode61 remove_diacritics 1"
        );

        CREATE TABLE IF NOT EXISTS _pipeline_build (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_source_row_hash_latest_source_hash
            ON source_row_hash_latest(source_id, raw_hash);

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
        PRAGMA wal_autocheckpoint=200000;
        PRAGMA foreign_keys=ON;
        "#,
    )?;
    conn.busy_timeout(Duration::from_secs(60))?;
    Ok(conn)
}
