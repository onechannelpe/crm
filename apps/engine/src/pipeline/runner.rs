use crate::pipeline::PipelineError;
use crate::pipeline::mapping::SourceMapping;
use crate::pipeline::normalize::{
    derive_dni_from_natural_ruc, normalize_dni, normalize_phone, normalize_ruc, normalize_text,
};
use csv::{ReaderBuilder, StringRecord};
use rusqlite::{Connection, OptionalExtension, Transaction, params};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Command {
    InitSchema {
        db: String,
    },
    RegisterSnapshot {
        db: String,
        source_key: String,
        source_name: String,
        snapshot_label: String,
        snapshot_date: String,
        file_path: String,
        reliability_rank: i64,
    },
    IngestSnapshot {
        db: String,
        mapping: String,
        input: String,
        snapshot_label: String,
        snapshot_date: String,
        batch_size: usize,
    },
    MaterializeServing {
        db: String,
    },
    ValidateSnapshot {
        db: String,
        snapshot_label: String,
    },
    PromoteDb {
        from: String,
        to: String,
    },
}

#[derive(Default)]
struct IngestCounters {
    total_rows: i64,
    accepted_rows: i64,
    invalid_dni_rows: i64,
    invalid_ruc_rows: i64,
    invalid_phone_rows: i64,
}

#[derive(Default)]
struct CanonicalRow {
    person_dni: Option<String>,
    person_full_name: String,
    company_ruc: Option<String>,
    company_name: String,
    role_name: String,
    role_start_date: String,
    rep_doc_type: String,
    rep_doc_number: String,
    rep_name: String,
    phones: Vec<String>,
}

pub fn parse_args(args: &[String]) -> Result<Command, PipelineError> {
    if args.is_empty() {
        return Err(PipelineError::Args("missing command".to_owned()));
    }

    let cmd = args[0].as_str();
    let flags = parse_flags(&args[1..])?;

    match cmd {
        "init-schema" => Ok(Command::InitSchema {
            db: required_flag(&flags, "--db")?.to_owned(),
        }),
        "register-snapshot" => {
            let reliability_rank = required_flag(&flags, "--reliability-rank")?
                .parse::<i64>()
                .map_err(|_| {
                    PipelineError::Args("expected integer for --reliability-rank".to_owned())
                })?;

            Ok(Command::RegisterSnapshot {
                db: required_flag(&flags, "--db")?.to_owned(),
                source_key: required_flag(&flags, "--source-key")?.to_owned(),
                source_name: required_flag(&flags, "--source-name")?.to_owned(),
                snapshot_label: required_flag(&flags, "--snapshot-label")?.to_owned(),
                snapshot_date: required_flag(&flags, "--snapshot-date")?.to_owned(),
                file_path: required_flag(&flags, "--file-path")?.to_owned(),
                reliability_rank,
            })
        }
        "ingest-snapshot" => {
            let batch_size = flags
                .get("--batch-size")
                .map(String::as_str)
                .unwrap_or("20000")
                .parse::<usize>()
                .map_err(|_| PipelineError::Args("expected integer for --batch-size".to_owned()))?;

            Ok(Command::IngestSnapshot {
                db: required_flag(&flags, "--db")?.to_owned(),
                mapping: required_flag(&flags, "--mapping")?.to_owned(),
                input: required_flag(&flags, "--input")?.to_owned(),
                snapshot_label: required_flag(&flags, "--snapshot-label")?.to_owned(),
                snapshot_date: required_flag(&flags, "--snapshot-date")?.to_owned(),
                batch_size,
            })
        }
        "materialize-serving" => Ok(Command::MaterializeServing {
            db: required_flag(&flags, "--db")?.to_owned(),
        }),
        "validate-snapshot" => Ok(Command::ValidateSnapshot {
            db: required_flag(&flags, "--db")?.to_owned(),
            snapshot_label: required_flag(&flags, "--snapshot-label")?.to_owned(),
        }),
        "promote-db" => Ok(Command::PromoteDb {
            from: required_flag(&flags, "--from")?.to_owned(),
            to: required_flag(&flags, "--to")?.to_owned(),
        }),
        _ => Err(PipelineError::Args(format!("unknown command: {cmd}"))),
    }
}

pub fn run(command: Command) -> Result<(), PipelineError> {
    match command {
        Command::InitSchema { db } => init_schema(&db),
        Command::RegisterSnapshot {
            db,
            source_key,
            source_name,
            snapshot_label,
            snapshot_date,
            file_path,
            reliability_rank,
        } => register_snapshot(
            &db,
            &source_key,
            &source_name,
            &snapshot_label,
            &snapshot_date,
            &file_path,
            reliability_rank,
        ),
        Command::IngestSnapshot {
            db,
            mapping,
            input,
            snapshot_label,
            snapshot_date,
            batch_size,
        } => ingest_snapshot(
            &db,
            &mapping,
            &input,
            &snapshot_label,
            &snapshot_date,
            batch_size,
        ),
        Command::MaterializeServing { db } => materialize_serving(&db),
        Command::ValidateSnapshot { db, snapshot_label } => validate_snapshot(&db, &snapshot_label),
        Command::PromoteDb { from, to } => promote_db(&from, &to),
    }
}

fn init_schema(db_path: &str) -> Result<(), PipelineError> {
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
        CREATE INDEX IF NOT EXISTS idx_person_phone_phone ON person_phone(phone);

        CREATE TABLE IF NOT EXISTS company_phone (
            company_id INTEGER NOT NULL,
            phone TEXT NOT NULL,
            first_seen_snapshot_id INTEGER NOT NULL,
            last_seen_snapshot_id INTEGER NOT NULL,
            confidence INTEGER NOT NULL DEFAULT 100,
            PRIMARY KEY(company_id, phone),
            FOREIGN KEY(company_id) REFERENCES company_profile(company_id)
        );
        CREATE INDEX IF NOT EXISTS idx_company_phone_phone ON company_phone(phone);

        CREATE TABLE IF NOT EXISTS role_phone (
            role_id INTEGER NOT NULL,
            phone TEXT NOT NULL,
            first_seen_snapshot_id INTEGER NOT NULL,
            last_seen_snapshot_id INTEGER NOT NULL,
            confidence INTEGER NOT NULL DEFAULT 70,
            PRIMARY KEY(role_id, phone),
            FOREIGN KEY(role_id) REFERENCES person_company_role(role_id)
        );
        CREATE INDEX IF NOT EXISTS idx_role_phone_phone ON role_phone(phone);

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
        CREATE INDEX IF NOT EXISTS idx_contacts_serving_dni ON contacts_serving(dni);
        CREATE INDEX IF NOT EXISTS idx_contacts_serving_ruc ON contacts_serving(org_ruc);

        CREATE TABLE IF NOT EXISTS phone_index (
            phone TEXT NOT NULL,
            contact_id INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_phone_index_phone ON phone_index(phone);

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

fn register_snapshot(
    db_path: &str,
    source_key: &str,
    source_name: &str,
    snapshot_label: &str,
    snapshot_date: &str,
    file_path: &str,
    reliability_rank: i64,
) -> Result<(), PipelineError> {
    if !Path::new(file_path).exists() {
        return Err(PipelineError::Args(format!(
            "file path does not exist: {file_path}"
        )));
    }

    let mut conn = open_rw(db_path)?;
    let tx = conn.transaction()?;
    let snapshot_id = upsert_snapshot(
        &tx,
        source_key,
        source_name,
        snapshot_label,
        snapshot_date,
        file_path,
        reliability_rank,
    )?;
    tx.commit()?;
    println!("registered snapshot_id={snapshot_id}");
    Ok(())
}

fn ingest_snapshot(
    db_path: &str,
    mapping_path: &str,
    input_path: &str,
    snapshot_label: &str,
    snapshot_date: &str,
    batch_size: usize,
) -> Result<(), PipelineError> {
    if !Path::new(input_path).exists() {
        return Err(PipelineError::Args(format!(
            "input path does not exist: {input_path}"
        )));
    }

    let mapping = SourceMapping::from_path(mapping_path)?;

    let mut conn = open_rw(db_path)?;
    let tx = conn.transaction()?;
    let snapshot_id = upsert_snapshot(
        &tx,
        &mapping.source_key,
        &mapping.source_name,
        snapshot_label,
        snapshot_date,
        input_path,
        100,
    )?;
    tx.execute(
        "UPDATE source_snapshot SET status='loading' WHERE snapshot_id=?1",
        [snapshot_id],
    )?;
    tx.commit()?;

    let mut reader = ReaderBuilder::new()
        .delimiter(mapping.delimiter_byte())
        .has_headers(mapping.has_header)
        .flexible(mapping.flexible)
        .from_path(input_path)?;

    let headers = if mapping.has_header {
        Some(reader.headers()?.clone())
    } else {
        None
    };
    let header_index = build_header_index(headers.as_ref());

    let mut counters = IngestCounters::default();
    let mut processed_in_batch = 0usize;
    let mut tx = conn.transaction()?;

    for (i, result) in reader.records().enumerate() {
        let record = result?;
        counters.total_rows += 1;
        let source_row_number = (i + 1) as i64;
        let canonical = map_record(&mapping, &record, headers.as_ref(), header_index.as_ref())?;
        let accepted = ingest_one_row(
            &tx,
            snapshot_id,
            source_row_number,
            mapping.delimiter.as_str(),
            &record,
            canonical,
            &mut counters,
        )?;
        if accepted {
            counters.accepted_rows += 1;
        }

        processed_in_batch += 1;
        if processed_in_batch >= batch_size {
            tx.commit()?;
            tx = conn.transaction()?;
            processed_in_batch = 0;
        }
    }

    persist_metrics(&tx, snapshot_id, &counters)?;
    tx.execute(
        "UPDATE source_snapshot SET status='completed' WHERE snapshot_id=?1",
        [snapshot_id],
    )?;
    tx.commit()?;

    println!(
        "{{\"snapshot_id\":{snapshot_id},\"total_rows\":{},\"accepted_rows\":{},\"invalid_dni_rows\":{},\"invalid_ruc_rows\":{},\"invalid_phone_rows\":{}}}",
        counters.total_rows,
        counters.accepted_rows,
        counters.invalid_dni_rows,
        counters.invalid_ruc_rows,
        counters.invalid_phone_rows
    );
    Ok(())
}

fn materialize_serving(db_path: &str) -> Result<(), PipelineError> {
    let mut conn = open_rw(db_path)?;
    let tx = conn.transaction()?;
    tx.execute_batch(
        r#"
        DELETE FROM contacts_serving;
        DELETE FROM phone_index;
        DELETE FROM ruc_phone_agg;
        DELETE FROM dni_phone_agg;
        DELETE FROM contacts_fts;

        INSERT INTO contacts_serving(dni, name, org_ruc, org_name, phone_primary, phone_secondary)
        SELECT
            p.dni,
            p.full_name,
            (
                SELECT c.ruc
                FROM person_company_role r
                JOIN company_profile c ON c.company_id = r.company_id
                WHERE r.person_id = p.person_id
                ORDER BY r.role_id
                LIMIT 1
            ) AS org_ruc,
            (
                SELECT c.legal_name
                FROM person_company_role r
                JOIN company_profile c ON c.company_id = r.company_id
                WHERE r.person_id = p.person_id
                ORDER BY r.role_id
                LIMIT 1
            ) AS org_name,
            (
                SELECT pp.phone
                FROM person_phone pp
                WHERE pp.person_id = p.person_id
                ORDER BY pp.confidence DESC, pp.phone
                LIMIT 1
            ) AS phone_primary,
            (
                SELECT pp.phone
                FROM person_phone pp
                WHERE pp.person_id = p.person_id
                ORDER BY pp.confidence DESC, pp.phone
                LIMIT 1 OFFSET 1
            ) AS phone_secondary
        FROM person_profile p
        WHERE p.dni IS NOT NULL AND p.dni <> '';

        INSERT INTO phone_index(phone, contact_id)
        SELECT DISTINCT pp.phone, cs.id
        FROM contacts_serving cs
        JOIN person_profile p ON p.dni = cs.dni
        JOIN person_phone pp ON pp.person_id = p.person_id;

        INSERT INTO ruc_phone_agg(org_ruc, phones)
        SELECT org_ruc, group_concat(phone, ';')
        FROM (
            SELECT cs.org_ruc AS org_ruc, pi.phone AS phone
            FROM contacts_serving cs
            JOIN phone_index pi ON pi.contact_id = cs.id
            WHERE cs.org_ruc IS NOT NULL AND cs.org_ruc <> ''
            GROUP BY cs.org_ruc, pi.phone
            ORDER BY cs.org_ruc, pi.phone
        )
        GROUP BY org_ruc;

        INSERT INTO dni_phone_agg(dni, phones)
        SELECT dni, group_concat(phone, ';')
        FROM (
            SELECT cs.dni AS dni, pi.phone AS phone
            FROM contacts_serving cs
            JOIN phone_index pi ON pi.contact_id = cs.id
            WHERE cs.dni IS NOT NULL AND cs.dni <> ''
            GROUP BY cs.dni, pi.phone
            ORDER BY cs.dni, pi.phone
        )
        GROUP BY dni;

        INSERT INTO contacts_fts(rowid, person_name, company_name)
        SELECT id, COALESCE(name,''), COALESCE(org_name,'')
        FROM contacts_serving;
        "#,
    )?;

    tx.commit()?;
    println!("materialized serving tables");
    Ok(())
}

fn validate_snapshot(db_path: &str, snapshot_label: &str) -> Result<(), PipelineError> {
    let conn = open_rw(db_path)?;

    let row = conn
        .query_row(
            r#"
            SELECT
                ss.snapshot_id,
                ss.status,
                sm.total_rows,
                sm.accepted_rows,
                sm.invalid_dni_rows,
                sm.invalid_ruc_rows,
                sm.invalid_phone_rows
            FROM source_snapshot ss
            LEFT JOIN snapshot_metrics sm ON sm.snapshot_id = ss.snapshot_id
            WHERE ss.snapshot_label = ?1
            ORDER BY ss.snapshot_id DESC
            LIMIT 1
            "#,
            [snapshot_label],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<i64>>(2)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(3)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(4)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(5)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(6)?.unwrap_or(0),
                ))
            },
        )
        .optional()?;

    let Some((
        snapshot_id,
        status,
        total_rows,
        accepted_rows,
        invalid_dni,
        invalid_ruc,
        invalid_phone,
    )) = row
    else {
        return Err(PipelineError::Args(format!(
            "snapshot not found for label: {snapshot_label}"
        )));
    };

    println!(
        "{{\"snapshot_id\":{snapshot_id},\"status\":\"{status}\",\"total_rows\":{total_rows},\"accepted_rows\":{accepted_rows},\"invalid_dni_rows\":{invalid_dni},\"invalid_ruc_rows\":{invalid_ruc},\"invalid_phone_rows\":{invalid_phone}}}"
    );
    Ok(())
}

fn promote_db(from: &str, to: &str) -> Result<(), PipelineError> {
    if !Path::new(from).exists() {
        return Err(PipelineError::Args(format!(
            "source db does not exist: {from}"
        )));
    }
    let tmp = format!("{to}.tmp");
    fs::copy(from, &tmp)?;
    fs::rename(&tmp, to)?;
    println!("promoted db to {to}");
    Ok(())
}

fn map_record(
    mapping: &SourceMapping,
    record: &StringRecord,
    headers: Option<&StringRecord>,
    header_index: Option<&HashMap<String, usize>>,
) -> Result<CanonicalRow, PipelineError> {
    let person_dni_raw = mapped_value("person_dni", mapping, record, headers, header_index);
    let rep_doc_type = mapped_value("rep_doc_type", mapping, record, headers, header_index);
    let rep_doc_number = mapped_value("rep_doc_number", mapping, record, headers, header_index);
    let person_full_name = mapped_value("person_full_name", mapping, record, headers, header_index);
    let rep_name = mapped_value("rep_name", mapping, record, headers, header_index);
    let company_ruc_raw = mapped_value("company_ruc", mapping, record, headers, header_index);

    Ok(CanonicalRow {
        person_dni: normalize_dni(&person_dni_raw)
            .or_else(|| {
                if rep_doc_type.eq_ignore_ascii_case("DNI") {
                    normalize_dni(&rep_doc_number)
                } else {
                    None
                }
            })
            .or_else(|| {
                normalize_ruc(&company_ruc_raw).and_then(|r| derive_dni_from_natural_ruc(&r))
            }),
        person_full_name: if !person_full_name.is_empty() {
            person_full_name
        } else {
            rep_name.clone()
        },
        company_ruc: normalize_ruc(&company_ruc_raw),
        company_name: mapped_value("company_name", mapping, record, headers, header_index),
        role_name: mapped_value("role_name", mapping, record, headers, header_index),
        role_start_date: mapped_value("role_start_date", mapping, record, headers, header_index),
        rep_doc_type,
        rep_doc_number,
        rep_name,
        phones: collect_phones(mapping, record, headers, header_index)?,
    })
}

fn collect_phones(
    mapping: &SourceMapping,
    record: &StringRecord,
    headers: Option<&StringRecord>,
    header_index: Option<&HashMap<String, usize>>,
) -> Result<Vec<String>, PipelineError> {
    let mut raw_values: Vec<String> = Vec::new();

    let direct_phone = mapped_value("phone", mapping, record, headers, header_index);
    if !direct_phone.is_empty() {
        raw_values.push(direct_phone);
    }

    for column in &mapping.phone_columns {
        if let Some(value) = value_from_column(column, record, headers, header_index)?
            && !value.is_empty()
        {
            raw_values.push(value);
        }
    }

    if let Some(hdr) = headers {
        for (idx, name) in hdr.iter().enumerate() {
            for prefix in &mapping.phone_prefixes {
                if name.starts_with(prefix) {
                    raw_values.push(record.get(idx).unwrap_or("").to_owned());
                    break;
                }
            }
        }
    }

    let mut unique = HashSet::new();
    let mut phones = Vec::new();
    for value in raw_values {
        if let Some(phone) = normalize_phone(&value)
            && unique.insert(phone.clone())
        {
            phones.push(phone);
        }
    }
    Ok(phones)
}

fn mapped_value(
    canonical: &str,
    mapping: &SourceMapping,
    record: &StringRecord,
    headers: Option<&StringRecord>,
    header_index: Option<&HashMap<String, usize>>,
) -> String {
    let Some(column) = mapping.fields.get(canonical) else {
        return String::new();
    };
    value_from_column(column, record, headers, header_index)
        .ok()
        .flatten()
        .map(|v| normalize_text(&v))
        .unwrap_or_default()
}

fn value_from_column(
    column: &str,
    record: &StringRecord,
    headers: Option<&StringRecord>,
    header_index: Option<&HashMap<String, usize>>,
) -> Result<Option<String>, PipelineError> {
    if let Ok(index) = column.parse::<usize>() {
        return Ok(Some(record.get(index).unwrap_or("").to_owned()));
    }

    let Some(hdrs) = headers else {
        return Err(PipelineError::Args(format!(
            "column mapping requires header, but source has no header: {column}"
        )));
    };
    let Some(indexes) = header_index else {
        return Err(PipelineError::Args("missing header index".to_owned()));
    };

    if !hdrs.iter().any(|h| h == column) {
        return Ok(None);
    }
    let idx = indexes
        .get(column)
        .ok_or_else(|| PipelineError::Args(format!("header not found: {column}")))?;
    Ok(Some(record.get(*idx).unwrap_or("").to_owned()))
}

fn build_header_index(headers: Option<&StringRecord>) -> Option<HashMap<String, usize>> {
    headers.map(|h| {
        h.iter()
            .enumerate()
            .map(|(idx, name)| (name.to_owned(), idx))
            .collect::<HashMap<_, _>>()
    })
}

fn ingest_one_row(
    tx: &Transaction<'_>,
    snapshot_id: i64,
    source_row_number: i64,
    delimiter: &str,
    record: &StringRecord,
    row: CanonicalRow,
    counters: &mut IngestCounters,
) -> Result<bool, PipelineError> {
    if row.person_dni.is_none()
        && row.company_ruc.is_none()
        && row.role_name.is_empty()
        && row.rep_doc_number.is_empty()
        && row.phones.is_empty()
    {
        if !row.rep_doc_number.is_empty() && row.person_dni.is_none() {
            counters.invalid_dni_rows += 1;
        }
        if row.company_ruc.is_none() && !row.company_name.is_empty() {
            counters.invalid_ruc_rows += 1;
        }
        return Ok(false);
    }

    let person_id = upsert_person(tx, row.person_dni.as_deref(), &row.person_full_name)?;
    let company_id = upsert_company(tx, row.company_ruc.as_deref(), &row.company_name)?;

    let role_id = if let Some(company_id) = company_id {
        if !row.role_name.is_empty() || !row.rep_doc_number.is_empty() || !row.rep_name.is_empty() {
            upsert_role(
                tx,
                person_id,
                company_id,
                &row.rep_doc_type,
                &row.rep_doc_number,
                &row.rep_name,
                &row.role_name,
                &row.role_start_date,
            )?
        } else {
            None
        }
    } else {
        None
    };

    if row.phones.is_empty() && !record.is_empty() {
        counters.invalid_phone_rows += 1;
    }
    for phone in &row.phones {
        if let Some(role_id) = role_id {
            upsert_role_phone(tx, role_id, phone, snapshot_id)?;
        } else if let Some(person_id) = person_id {
            upsert_person_phone(tx, person_id, phone, snapshot_id)?;
        } else if let Some(company_id) = company_id {
            upsert_company_phone(tx, company_id, phone, snapshot_id)?;
        }
    }

    let raw_hash = hash_record(record, delimiter);
    if let Some(person_id) = person_id {
        insert_evidence(
            tx,
            "person",
            person_id,
            snapshot_id,
            source_row_number,
            &raw_hash,
        )?;
    }
    if let Some(company_id) = company_id {
        insert_evidence(
            tx,
            "company",
            company_id,
            snapshot_id,
            source_row_number,
            &raw_hash,
        )?;
    }
    if let Some(role_id) = role_id {
        insert_evidence(
            tx,
            "role",
            role_id,
            snapshot_id,
            source_row_number,
            &raw_hash,
        )?;
    }

    Ok(true)
}

fn upsert_person(
    tx: &Transaction<'_>,
    dni: Option<&str>,
    full_name: &str,
) -> Result<Option<i64>, PipelineError> {
    if let Some(dni) = dni {
        tx.execute(
            r#"
            INSERT INTO person_profile(dni, full_name)
            VALUES (?1, ?2)
            ON CONFLICT(dni) DO UPDATE SET
                full_name = CASE
                    WHEN excluded.full_name <> '' THEN excluded.full_name
                    ELSE person_profile.full_name
                END
            "#,
            params![dni, full_name],
        )?;
        let id = tx.query_row(
            "SELECT person_id FROM person_profile WHERE dni=?1",
            [dni],
            |row| row.get(0),
        )?;
        return Ok(Some(id));
    }

    if full_name.is_empty() {
        return Ok(None);
    }
    tx.execute(
        "INSERT INTO person_profile(dni, full_name) VALUES (NULL, ?1)",
        [full_name],
    )?;
    Ok(Some(tx.last_insert_rowid()))
}

fn upsert_company(
    tx: &Transaction<'_>,
    ruc: Option<&str>,
    legal_name: &str,
) -> Result<Option<i64>, PipelineError> {
    let Some(ruc) = ruc else {
        return Ok(None);
    };

    tx.execute(
        r#"
        INSERT INTO company_profile(ruc, legal_name)
        VALUES (?1, ?2)
        ON CONFLICT(ruc) DO UPDATE SET
            legal_name = CASE
                WHEN excluded.legal_name <> '' THEN excluded.legal_name
                ELSE company_profile.legal_name
            END
        "#,
        params![ruc, legal_name],
    )?;
    let company_id = tx.query_row(
        "SELECT company_id FROM company_profile WHERE ruc=?1",
        [ruc],
        |row| row.get(0),
    )?;
    Ok(Some(company_id))
}

#[allow(clippy::too_many_arguments)]
fn upsert_role(
    tx: &Transaction<'_>,
    person_id: Option<i64>,
    company_id: i64,
    rep_doc_type: &str,
    rep_doc_number: &str,
    rep_name: &str,
    role_name: &str,
    role_start_date: &str,
) -> Result<Option<i64>, PipelineError> {
    tx.execute(
        r#"
        INSERT INTO person_company_role(
            person_id, company_id, rep_doc_type, rep_doc_number, rep_name, role_name, role_start_date, resolution_status
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ON CONFLICT(company_id, rep_doc_type, rep_doc_number, role_name, role_start_date) DO UPDATE SET
            person_id = COALESCE(person_company_role.person_id, excluded.person_id),
            rep_name = CASE
                WHEN excluded.rep_name <> '' THEN excluded.rep_name
                ELSE person_company_role.rep_name
            END,
            resolution_status = excluded.resolution_status
        "#,
        params![
            person_id,
            company_id,
            rep_doc_type,
            rep_doc_number,
            rep_name,
            role_name,
            role_start_date,
            if person_id.is_some() {
                "resolved"
            } else {
                "unresolved"
            }
        ],
    )?;

    let role_id = tx.query_row(
        r#"
        SELECT role_id
        FROM person_company_role
        WHERE company_id=?1
          AND rep_doc_type=?2
          AND rep_doc_number=?3
          AND role_name=?4
          AND role_start_date=?5
        "#,
        params![
            company_id,
            rep_doc_type,
            rep_doc_number,
            role_name,
            role_start_date
        ],
        |row| row.get(0),
    )?;
    Ok(Some(role_id))
}

fn upsert_person_phone(
    tx: &Transaction<'_>,
    person_id: i64,
    phone: &str,
    snapshot_id: i64,
) -> Result<(), PipelineError> {
    tx.execute(
        r#"
        INSERT INTO person_phone(person_id, phone, first_seen_snapshot_id, last_seen_snapshot_id, confidence)
        VALUES (?1, ?2, ?3, ?3, 100)
        ON CONFLICT(person_id, phone) DO UPDATE SET
            last_seen_snapshot_id=excluded.last_seen_snapshot_id
        "#,
        params![person_id, phone, snapshot_id],
    )?;
    Ok(())
}

fn upsert_company_phone(
    tx: &Transaction<'_>,
    company_id: i64,
    phone: &str,
    snapshot_id: i64,
) -> Result<(), PipelineError> {
    tx.execute(
        r#"
        INSERT INTO company_phone(company_id, phone, first_seen_snapshot_id, last_seen_snapshot_id, confidence)
        VALUES (?1, ?2, ?3, ?3, 100)
        ON CONFLICT(company_id, phone) DO UPDATE SET
            last_seen_snapshot_id=excluded.last_seen_snapshot_id
        "#,
        params![company_id, phone, snapshot_id],
    )?;
    Ok(())
}

fn upsert_role_phone(
    tx: &Transaction<'_>,
    role_id: i64,
    phone: &str,
    snapshot_id: i64,
) -> Result<(), PipelineError> {
    tx.execute(
        r#"
        INSERT INTO role_phone(role_id, phone, first_seen_snapshot_id, last_seen_snapshot_id, confidence)
        VALUES (?1, ?2, ?3, ?3, 70)
        ON CONFLICT(role_id, phone) DO UPDATE SET
            last_seen_snapshot_id=excluded.last_seen_snapshot_id
        "#,
        params![role_id, phone, snapshot_id],
    )?;
    Ok(())
}

fn insert_evidence(
    tx: &Transaction<'_>,
    entity_kind: &str,
    entity_pk: i64,
    snapshot_id: i64,
    source_row_number: i64,
    raw_hash: &str,
) -> Result<(), PipelineError> {
    tx.execute(
        r#"
        INSERT INTO entity_evidence(entity_kind, entity_pk, snapshot_id, source_row_number, raw_hash)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(entity_kind, entity_pk, snapshot_id, source_row_number) DO NOTHING
        "#,
        params![entity_kind, entity_pk, snapshot_id, source_row_number, raw_hash],
    )?;
    Ok(())
}

fn persist_metrics(
    tx: &Transaction<'_>,
    snapshot_id: i64,
    counters: &IngestCounters,
) -> Result<(), PipelineError> {
    tx.execute(
        r#"
        INSERT INTO snapshot_metrics(
            snapshot_id, total_rows, accepted_rows, invalid_dni_rows, invalid_ruc_rows, invalid_phone_rows
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ON CONFLICT(snapshot_id) DO UPDATE SET
            total_rows=excluded.total_rows,
            accepted_rows=excluded.accepted_rows,
            invalid_dni_rows=excluded.invalid_dni_rows,
            invalid_ruc_rows=excluded.invalid_ruc_rows,
            invalid_phone_rows=excluded.invalid_phone_rows
        "#,
        params![
            snapshot_id,
            counters.total_rows,
            counters.accepted_rows,
            counters.invalid_dni_rows,
            counters.invalid_ruc_rows,
            counters.invalid_phone_rows
        ],
    )?;
    Ok(())
}

fn hash_record(record: &StringRecord, delimiter: &str) -> String {
    let joined = record.iter().collect::<Vec<_>>().join(delimiter);
    let mut hasher = Sha256::new();
    hasher.update(joined.as_bytes());
    let output = hasher.finalize();
    hex::encode(output)
}

fn upsert_snapshot(
    tx: &Transaction<'_>,
    source_key: &str,
    source_name: &str,
    snapshot_label: &str,
    snapshot_date: &str,
    file_path: &str,
    reliability_rank: i64,
) -> Result<i64, PipelineError> {
    tx.execute(
        r#"
        INSERT INTO source_registry(source_key, source_name, reliability_rank)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(source_key) DO UPDATE SET
            source_name=excluded.source_name,
            reliability_rank=excluded.reliability_rank
        "#,
        params![source_key, source_name, reliability_rank],
    )?;

    let source_id: i64 = tx.query_row(
        "SELECT source_id FROM source_registry WHERE source_key=?1",
        [source_key],
        |row| row.get(0),
    )?;

    tx.execute(
        r#"
        INSERT INTO source_snapshot(source_id, snapshot_label, snapshot_date, file_path, status)
        VALUES (?1, ?2, ?3, ?4, 'registered')
        ON CONFLICT(source_id, snapshot_label) DO UPDATE SET
            snapshot_date=excluded.snapshot_date,
            file_path=excluded.file_path
        "#,
        params![source_id, snapshot_label, snapshot_date, file_path],
    )?;

    let snapshot_id: i64 = tx.query_row(
        "SELECT snapshot_id FROM source_snapshot WHERE source_id=?1 AND snapshot_label=?2",
        params![source_id, snapshot_label],
        |row| row.get(0),
    )?;
    Ok(snapshot_id)
}

fn open_rw(db_path: &str) -> Result<Connection, PipelineError> {
    let conn = Connection::open(db_path)?;
    conn.execute_batch(
        r#"
        PRAGMA journal_mode=WAL;
        PRAGMA synchronous=NORMAL;
        PRAGMA temp_store=MEMORY;
        PRAGMA foreign_keys=ON;
        "#,
    )?;
    Ok(conn)
}

fn parse_flags(args: &[String]) -> Result<HashMap<String, String>, PipelineError> {
    let mut out = HashMap::new();
    let mut i = 0usize;
    while i < args.len() {
        let key = args[i].clone();
        if !key.starts_with("--") {
            return Err(PipelineError::Args(format!(
                "expected flag starting with --, got: {key}"
            )));
        }
        let Some(value) = args.get(i + 1) else {
            return Err(PipelineError::Args(format!(
                "missing value for flag: {key}"
            )));
        };
        out.insert(key, value.clone());
        i += 2;
    }
    Ok(out)
}

fn required_flag<'a>(
    flags: &'a HashMap<String, String>,
    name: &str,
) -> Result<&'a str, PipelineError> {
    flags
        .get(name)
        .map(String::as_str)
        .ok_or_else(|| PipelineError::Args(format!("missing required flag: {name}")))
}

#[cfg(test)]
mod tests {
    use super::{Command, parse_args, run};
    use rusqlite::Connection;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn parses_init_schema() {
        let args = vec![
            "init-schema".to_owned(),
            "--db".to_owned(),
            "a.sqlite".to_owned(),
        ];
        let cmd = parse_args(&args).expect("parse should succeed");
        assert_eq!(
            cmd,
            Command::InitSchema {
                db: "a.sqlite".to_owned()
            }
        );
    }

    #[test]
    fn ingests_and_materializes_small_snapshot() {
        let temp = TempDir::new().expect("tempdir");
        let db_path = temp.path().join("pipeline.sqlite");
        let input_path = temp.path().join("sample.csv");
        let mapping_path = temp.path().join("mapping.json");

        fs::write(
            &input_path,
            "dni,name,ruc,company,role,phone\n12345678,ANA RAMOS,20100099991,ACME SAC,GERENTE,987111222\n23456789,LUIS PEREZ,20100099991,ACME SAC,APODERADO,999333444\n",
        )
        .expect("write input");
        fs::write(
            &mapping_path,
            r#"{
  "source_key":"sample",
  "source_name":"Sample",
  "delimiter":",",
  "has_header":true,
  "fields":{
    "person_dni":"dni",
    "person_full_name":"name",
    "company_ruc":"ruc",
    "company_name":"company",
    "role_name":"role",
    "phone":"phone"
  }
}"#,
        )
        .expect("write mapping");

        run(Command::InitSchema {
            db: db_path.to_string_lossy().to_string(),
        })
        .expect("init schema");
        run(Command::IngestSnapshot {
            db: db_path.to_string_lossy().to_string(),
            mapping: mapping_path.to_string_lossy().to_string(),
            input: input_path.to_string_lossy().to_string(),
            snapshot_label: "s1".to_owned(),
            snapshot_date: "2026-01-01".to_owned(),
            batch_size: 10,
        })
        .expect("ingest");
        run(Command::MaterializeServing {
            db: db_path.to_string_lossy().to_string(),
        })
        .expect("materialize");

        let conn = Connection::open(db_path).expect("open db");
        let contacts: i64 = conn
            .query_row("SELECT COUNT(*) FROM contacts_serving", [], |r| r.get(0))
            .expect("contacts count");
        let roles: i64 = conn
            .query_row("SELECT COUNT(*) FROM person_company_role", [], |r| r.get(0))
            .expect("roles count");
        let role_phones: i64 = conn
            .query_row("SELECT COUNT(*) FROM role_phone", [], |r| r.get(0))
            .expect("role phones count");
        let person_phones: i64 = conn
            .query_row("SELECT COUNT(*) FROM person_phone", [], |r| r.get(0))
            .expect("person phones count");

        assert_eq!(contacts, 2);
        assert_eq!(roles, 2);
        assert_eq!(role_phones, 2);
        assert_eq!(person_phones, 0);
    }
}
