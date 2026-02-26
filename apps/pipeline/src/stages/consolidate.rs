use crate::PipelineError;
use crate::config::mapping::SourceMapping;
use crate::db::repo;
use crate::db::schema::{init_schema, open_rw};
use crate::domain::canonical;
use csv::ReaderBuilder;
use rusqlite::params;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::mpsc::{self, Receiver, SyncSender};
use std::thread;
use std::time::Instant;

const DEFAULT_PROGRESS_EVERY_ROWS: i64 = 500_000;
const DEFAULT_SHARDED_WORKERS: usize = 4;
const MAX_SHARDED_WORKERS: usize = 32;

fn progress_every_rows() -> i64 {
    std::env::var("CRM_PIPELINE_PROGRESS_EVERY_ROWS")
        .ok()
        .and_then(|value| value.parse::<i64>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(DEFAULT_PROGRESS_EVERY_ROWS)
}

fn sharded_workers() -> usize {
    let available = thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(DEFAULT_SHARDED_WORKERS);
    std::env::var("CRM_PIPELINE_SHARDED_WORKERS")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| *value >= 2)
        .unwrap_or(available)
        .clamp(2, MAX_SHARDED_WORKERS)
}

fn sanitize_path_component(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for ch in value.chars() {
        if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
            out.push(ch);
        } else {
            out.push('_');
        }
    }
    out
}

#[derive(Default, Clone)]
pub(crate) struct IngestCounters {
    pub(crate) total_rows: i64,
    pub(crate) accepted_rows: i64,
    pub(crate) invalid_dni_rows: i64,
    pub(crate) invalid_ruc_rows: i64,
    pub(crate) invalid_phone_rows: i64,
}

impl IngestCounters {
    fn add_from(&mut self, other: &IngestCounters) {
        self.total_rows += other.total_rows;
        self.accepted_rows += other.accepted_rows;
        self.invalid_dni_rows += other.invalid_dni_rows;
        self.invalid_ruc_rows += other.invalid_ruc_rows;
        self.invalid_phone_rows += other.invalid_phone_rows;
    }
}

struct ShardTask {
    source_row_number: i64,
    record: csv::StringRecord,
}

struct ShardWorkerResult {
    shard_index: usize,
    shard_db_path: PathBuf,
    counters: IngestCounters,
}

pub fn register_snapshot(
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
    let snapshot_id = repo::upsert_snapshot(
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

pub fn ingest_snapshot(
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
    let snapshot_id = repo::upsert_snapshot(
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
    let resolved_mapping = canonical::resolve_mapping(&mapping, headers.as_ref())?;

    let ingest_result = (|| -> Result<IngestCounters, PipelineError> {
        let started_at = Instant::now();
        let progress_every = progress_every_rows();
        let mut counters = IngestCounters::default();
        let mut processed_in_batch = 0usize;
        let mut tx = conn.transaction()?;
        let mut statements = repo::IngestStatements::new(&tx)?;

        for (i, result) in reader.records().enumerate() {
            let record = result?;
            counters.total_rows += 1;
            let source_row_number = (i + 1) as i64;
            let canonical_row = canonical::map_record(&resolved_mapping, &record);
            let accepted = repo::ingest_one_row(
                &mut statements,
                snapshot_id,
                source_row_number,
                mapping.delimiter.as_str(),
                &record,
                canonical_row,
                &mut counters,
            )?;
            if accepted {
                counters.accepted_rows += 1;
            }

            if counters.total_rows % progress_every == 0 {
                let elapsed_secs = started_at.elapsed().as_secs_f64();
                let rows_per_sec = if elapsed_secs > 0.0 {
                    counters.total_rows as f64 / elapsed_secs
                } else {
                    0.0
                };
                println!(
                    "[pipeline] ingest progress snapshot_id={snapshot_id} total_rows={} accepted_rows={} rate_rows_per_sec={rows_per_sec:.0}",
                    counters.total_rows,
                    counters.accepted_rows
                );
            }

            processed_in_batch += 1;
            if processed_in_batch >= batch_size {
                drop(statements);
                tx.commit()?;
                tx = conn.transaction()?;
                statements = repo::IngestStatements::new(&tx)?;
                processed_in_batch = 0;
            }
        }

        drop(statements);
        repo::persist_metrics(&tx, snapshot_id, &counters)?;
        tx.execute(
            "UPDATE source_snapshot SET status='completed' WHERE snapshot_id=?1",
            [snapshot_id],
        )?;
        tx.commit()?;
        Ok(counters)
    })();

    let counters = match ingest_result {
        Ok(counters) => counters,
        Err(err) => {
            let tx = conn.transaction()?;
            tx.execute(
                "UPDATE source_snapshot SET status='failed' WHERE snapshot_id=?1",
                [snapshot_id],
            )?;
            tx.commit()?;
            return Err(err);
        }
    };

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

pub fn ingest_snapshot_sharded(
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
    let workers = sharded_workers();
    let progress_every = progress_every_rows();
    println!("[pipeline] ingest mode=sharded workers={workers}");

    let mut header_reader = ReaderBuilder::new()
        .delimiter(mapping.delimiter_byte())
        .has_headers(mapping.has_header)
        .flexible(mapping.flexible)
        .from_path(input_path)?;
    let headers = if mapping.has_header {
        Some(header_reader.headers()?.clone())
    } else {
        None
    };
    let resolved_mapping = canonical::resolve_mapping(&mapping, headers.as_ref())?;
    drop(header_reader);

    let mut conn = open_rw(db_path)?;
    let tx = conn.transaction()?;
    let snapshot_id = repo::upsert_snapshot(
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

    let shard_root = Path::new(db_path)
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join("shards")
        .join(format!(
            "{}-{}",
            sanitize_path_component(&mapping.source_key),
            sanitize_path_component(snapshot_label)
        ));
    if shard_root.exists() {
        fs::remove_dir_all(&shard_root)?;
    }
    fs::create_dir_all(&shard_root)?;

    let mut task_senders: Vec<SyncSender<ShardTask>> = Vec::with_capacity(workers);
    let mut handles = Vec::with_capacity(workers);
    let snapshot_date_owned = snapshot_date.to_owned();
    for worker_index in 0..workers {
        let (tx, rx) = mpsc::sync_channel::<ShardTask>(4096);
        task_senders.push(tx);

        let shard_db_path = shard_root.join(format!("shard-{worker_index:02}.sqlite"));
        let shard_label = format!("{snapshot_label}-shard-{worker_index:02}");
        let worker_mapping = mapping.clone();
        let worker_resolved = resolved_mapping.clone();
        let worker_input_path = input_path.to_owned();
        let worker_snapshot_date = snapshot_date_owned.clone();
        handles.push(thread::spawn(move || {
            run_shard_worker(
                worker_index,
                shard_db_path,
                worker_mapping,
                worker_resolved,
                worker_input_path,
                shard_label,
                worker_snapshot_date,
                batch_size,
                rx,
            )
            .map_err(|err| err.to_string())
        }));
    }

    let dispatch_started_at = Instant::now();
    let dispatch_result = (|| -> Result<i64, PipelineError> {
        let mut reader = ReaderBuilder::new()
            .delimiter(mapping.delimiter_byte())
            .has_headers(mapping.has_header)
            .flexible(mapping.flexible)
            .from_path(input_path)?;

        if mapping.has_header {
            let _ = reader.headers()?;
        }

        let mut total_rows = 0i64;
        for (i, result) in reader.records().enumerate() {
            let record = result?;
            let source_row_number = (i + 1) as i64;
            let worker_index = i % workers;
            task_senders[worker_index]
                .send(ShardTask {
                    source_row_number,
                    record,
                })
                .map_err(|err| {
                    PipelineError::Args(format!(
                        "failed to dispatch record to shard worker {worker_index}: {err}"
                    ))
                })?;
            total_rows += 1;

            if total_rows % progress_every == 0 {
                let elapsed_secs = dispatch_started_at.elapsed().as_secs_f64();
                let rows_per_sec = if elapsed_secs > 0.0 {
                    total_rows as f64 / elapsed_secs
                } else {
                    0.0
                };
                println!(
                    "[pipeline] shard dispatch progress snapshot_id={snapshot_id} total_rows={total_rows} rate_rows_per_sec={rows_per_sec:.0}",
                );
            }
        }
        Ok(total_rows)
    })();
    drop(task_senders);

    let dispatch_total_rows = match dispatch_result {
        Ok(total_rows) => total_rows,
        Err(err) => {
            for handle in handles {
                let _ = handle.join();
            }
            let tx = conn.transaction()?;
            tx.execute(
                "UPDATE source_snapshot SET status='failed' WHERE snapshot_id=?1",
                [snapshot_id],
            )?;
            tx.commit()?;
            return Err(err);
        }
    };

    let mut shard_results = Vec::with_capacity(workers);
    for handle in handles {
        let worker_result = handle
            .join()
            .map_err(|_| PipelineError::Args("sharded ingest worker panicked".to_owned()))?
            .map_err(PipelineError::Args)?;
        shard_results.push(worker_result);
    }
    shard_results.sort_by_key(|result| result.shard_index);

    let mut merged_counters = IngestCounters::default();
    for shard_result in &shard_results {
        merged_counters.add_from(&shard_result.counters);
        println!(
            "[pipeline] merge shard index={} db={}",
            shard_result.shard_index,
            shard_result.shard_db_path.display()
        );
        merge_shard_db_into_main(db_path, &shard_result.shard_db_path, snapshot_id)?;
    }

    let tx = conn.transaction()?;
    repo::persist_metrics(&tx, snapshot_id, &merged_counters)?;
    tx.execute(
        "UPDATE source_snapshot SET status='completed' WHERE snapshot_id=?1",
        [snapshot_id],
    )?;
    tx.commit()?;

    println!(
        "{{\"snapshot_id\":{snapshot_id},\"total_rows\":{},\"accepted_rows\":{},\"invalid_dni_rows\":{},\"invalid_ruc_rows\":{},\"invalid_phone_rows\":{}}}",
        merged_counters.total_rows,
        merged_counters.accepted_rows,
        merged_counters.invalid_dni_rows,
        merged_counters.invalid_ruc_rows,
        merged_counters.invalid_phone_rows
    );
    if dispatch_total_rows != merged_counters.total_rows {
        return Err(PipelineError::Args(format!(
            "sharded ingest row mismatch: dispatched={dispatch_total_rows} merged_total={}",
            merged_counters.total_rows
        )));
    }
    Ok(())
}

fn run_shard_worker(
    worker_index: usize,
    shard_db_path: PathBuf,
    mapping: SourceMapping,
    resolved_mapping: canonical::ResolvedMapping,
    input_path: String,
    snapshot_label: String,
    snapshot_date: String,
    batch_size: usize,
    rx: Receiver<ShardTask>,
) -> Result<ShardWorkerResult, PipelineError> {
    if shard_db_path.exists() {
        fs::remove_file(&shard_db_path)?;
    }
    init_schema(&shard_db_path.to_string_lossy())?;

    let mut conn = open_rw(&shard_db_path.to_string_lossy())?;
    let tx = conn.transaction()?;
    let shard_snapshot_id = repo::upsert_snapshot(
        &tx,
        &mapping.source_key,
        &mapping.source_name,
        &snapshot_label,
        &snapshot_date,
        &input_path,
        100,
    )?;
    tx.execute(
        "UPDATE source_snapshot SET status='loading' WHERE snapshot_id=?1",
        [shard_snapshot_id],
    )?;
    tx.commit()?;

    let ingest_result = (|| -> Result<IngestCounters, PipelineError> {
        let mut counters = IngestCounters::default();
        let mut processed_in_batch = 0usize;
        let mut tx = conn.transaction()?;
        let mut statements = repo::IngestStatements::new(&tx)?;

        while let Ok(task) = rx.recv() {
            counters.total_rows += 1;
            let canonical_row = canonical::map_record(&resolved_mapping, &task.record);
            let accepted = repo::ingest_one_row(
                &mut statements,
                shard_snapshot_id,
                task.source_row_number,
                mapping.delimiter.as_str(),
                &task.record,
                canonical_row,
                &mut counters,
            )?;
            if accepted {
                counters.accepted_rows += 1;
            }

            processed_in_batch += 1;
            if processed_in_batch >= batch_size {
                drop(statements);
                tx.commit()?;
                tx = conn.transaction()?;
                statements = repo::IngestStatements::new(&tx)?;
                processed_in_batch = 0;
            }
        }

        drop(statements);
        repo::persist_metrics(&tx, shard_snapshot_id, &counters)?;
        tx.execute(
            "UPDATE source_snapshot SET status='completed' WHERE snapshot_id=?1",
            [shard_snapshot_id],
        )?;
        tx.commit()?;
        Ok(counters)
    })();

    let counters = match ingest_result {
        Ok(counters) => counters,
        Err(err) => {
            let tx = conn.transaction()?;
            tx.execute(
                "UPDATE source_snapshot SET status='failed' WHERE snapshot_id=?1",
                [shard_snapshot_id],
            )?;
            tx.commit()?;
            return Err(err);
        }
    };

    Ok(ShardWorkerResult {
        shard_index: worker_index,
        shard_db_path,
        counters,
    })
}

fn merge_shard_db_into_main(
    main_db_path: &str,
    shard_db_path: &Path,
    main_snapshot_id: i64,
) -> Result<(), PipelineError> {
    let mut main_conn = open_rw(main_db_path)?;
    let tx = main_conn.transaction()?;
    let shard_conn = open_rw(&shard_db_path.to_string_lossy())?;
    {
        let mut upsert_person_by_dni = tx.prepare_cached(
            r#"
            INSERT INTO person_profile(dni, natural_ruc10, full_name)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(dni) DO UPDATE SET
                natural_ruc10 = CASE
                    WHEN excluded.natural_ruc10 IS NOT NULL AND excluded.natural_ruc10 <> ''
                        THEN excluded.natural_ruc10
                    ELSE person_profile.natural_ruc10
                END,
                full_name = CASE
                    WHEN excluded.full_name <> '' THEN excluded.full_name
                    ELSE person_profile.full_name
                END
            RETURNING person_id
            "#,
        )?;
        let mut insert_person_without_dni = tx.prepare_cached(
            "INSERT INTO person_profile(dni, natural_ruc10, full_name) VALUES (NULL, ?1, ?2) RETURNING person_id",
        )?;
        let mut upsert_company = tx.prepare_cached(
            r#"
            INSERT INTO company_profile(ruc, legal_name)
            VALUES (?1, ?2)
            ON CONFLICT(ruc) DO UPDATE SET
                legal_name = CASE
                    WHEN excluded.legal_name <> '' THEN excluded.legal_name
                    ELSE company_profile.legal_name
                END
            RETURNING company_id
            "#,
        )?;
        let mut upsert_role = tx.prepare_cached(
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
            RETURNING role_id
            "#,
        )?;
        let mut upsert_person_phone = tx.prepare_cached(
            r#"
            INSERT INTO person_phone(person_id, phone, first_seen_snapshot_id, last_seen_snapshot_id, confidence)
            VALUES (?1, ?2, ?3, ?3, 100)
            ON CONFLICT(person_id, phone) DO UPDATE SET
                last_seen_snapshot_id=excluded.last_seen_snapshot_id
            "#,
        )?;
        let mut upsert_company_phone = tx.prepare_cached(
            r#"
            INSERT INTO company_phone(company_id, phone, first_seen_snapshot_id, last_seen_snapshot_id, confidence)
            VALUES (?1, ?2, ?3, ?3, 100)
            ON CONFLICT(company_id, phone) DO UPDATE SET
                last_seen_snapshot_id=excluded.last_seen_snapshot_id
            "#,
        )?;
        let mut upsert_role_phone = tx.prepare_cached(
            r#"
            INSERT INTO role_phone(role_id, phone, first_seen_snapshot_id, last_seen_snapshot_id, confidence)
            VALUES (?1, ?2, ?3, ?3, 70)
            ON CONFLICT(role_id, phone) DO UPDATE SET
                last_seen_snapshot_id=excluded.last_seen_snapshot_id
            "#,
        )?;
        let mut insert_evidence = tx.prepare_cached(
            r#"
            INSERT INTO entity_evidence(entity_kind, entity_pk, snapshot_id, source_row_number, raw_hash)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ON CONFLICT(entity_kind, entity_pk, snapshot_id, source_row_number) DO NOTHING
            "#,
        )?;

        let mut person_id_map: HashMap<i64, i64> = HashMap::new();
        {
            let mut statement = shard_conn.prepare(
                "SELECT person_id, dni, natural_ruc10, full_name FROM person_profile ORDER BY person_id",
            )?;
            let mut rows = statement.query([])?;
            while let Some(row) = rows.next()? {
                let shard_person_id: i64 = row.get(0)?;
                let dni: Option<String> = row.get(1)?;
                let natural_ruc10: Option<String> = row.get(2)?;
                let full_name: String = row.get(3)?;

                let main_person_id = if let Some(dni) = non_empty(dni) {
                    upsert_person_by_dni.query_row(
                        params![dni, non_empty(natural_ruc10), full_name],
                        |person_row| person_row.get(0),
                    )?
                } else if full_name.is_empty() {
                    continue;
                } else {
                    insert_person_without_dni.query_row(
                        params![non_empty(natural_ruc10), full_name],
                        |person_row| person_row.get(0),
                    )?
                };
                person_id_map.insert(shard_person_id, main_person_id);
            }
        }

        let mut company_id_map: HashMap<i64, i64> = HashMap::new();
        {
            let mut statement = shard_conn
                .prepare("SELECT company_id, ruc, legal_name FROM company_profile ORDER BY company_id")?;
            let mut rows = statement.query([])?;
            while let Some(row) = rows.next()? {
                let shard_company_id: i64 = row.get(0)?;
                let ruc: String = row.get(1)?;
                let legal_name: String = row.get(2)?;
                let main_company_id = upsert_company
                    .query_row(params![ruc, legal_name], |company_row| company_row.get(0))?;
                company_id_map.insert(shard_company_id, main_company_id);
            }
        }

        let mut role_id_map: HashMap<i64, i64> = HashMap::new();
        {
            let mut statement = shard_conn.prepare(
                r#"
                SELECT role_id, person_id, company_id, rep_doc_type, rep_doc_number, rep_name, role_name, role_start_date
                FROM person_company_role
                ORDER BY role_id
                "#,
            )?;
            let mut rows = statement.query([])?;
            while let Some(row) = rows.next()? {
                let shard_role_id: i64 = row.get(0)?;
                let shard_person_id: Option<i64> = row.get(1)?;
                let shard_company_id: i64 = row.get(2)?;
                let rep_doc_type: String = row.get(3)?;
                let rep_doc_number: String = row.get(4)?;
                let rep_name: String = row.get(5)?;
                let role_name: String = row.get(6)?;
                let role_start_date: String = row.get(7)?;

                let main_person_id = shard_person_id.and_then(|id| person_id_map.get(&id).copied());
                let Some(main_company_id) = company_id_map.get(&shard_company_id).copied() else {
                    return Err(PipelineError::Args(format!(
                        "missing company mapping while merging shard role_id={shard_role_id}"
                    )));
                };
                let resolution_status = if main_person_id.is_some() {
                    "resolved"
                } else {
                    "unresolved"
                };

                let main_role_id = upsert_role.query_row(
                    params![
                        main_person_id,
                        main_company_id,
                        rep_doc_type,
                        rep_doc_number,
                        rep_name,
                        role_name,
                        role_start_date,
                        resolution_status
                    ],
                    |role_row| role_row.get(0),
                )?;
                role_id_map.insert(shard_role_id, main_role_id);
            }
        }

        {
            let mut statement = shard_conn.prepare("SELECT person_id, phone FROM person_phone")?;
            let mut rows = statement.query([])?;
            while let Some(row) = rows.next()? {
                let shard_person_id: i64 = row.get(0)?;
                let phone: String = row.get(1)?;
                let Some(main_person_id) = person_id_map.get(&shard_person_id).copied() else {
                    continue;
                };
                upsert_person_phone.execute(params![main_person_id, phone, main_snapshot_id])?;
            }
        }

        {
            let mut statement = shard_conn.prepare("SELECT company_id, phone FROM company_phone")?;
            let mut rows = statement.query([])?;
            while let Some(row) = rows.next()? {
                let shard_company_id: i64 = row.get(0)?;
                let phone: String = row.get(1)?;
                let Some(main_company_id) = company_id_map.get(&shard_company_id).copied() else {
                    continue;
                };
                upsert_company_phone.execute(params![main_company_id, phone, main_snapshot_id])?;
            }
        }

        {
            let mut statement = shard_conn.prepare("SELECT role_id, phone FROM role_phone")?;
            let mut rows = statement.query([])?;
            while let Some(row) = rows.next()? {
                let shard_role_id: i64 = row.get(0)?;
                let phone: String = row.get(1)?;
                let Some(main_role_id) = role_id_map.get(&shard_role_id).copied() else {
                    continue;
                };
                upsert_role_phone.execute(params![main_role_id, phone, main_snapshot_id])?;
            }
        }

        {
            let mut statement = shard_conn.prepare(
                "SELECT entity_kind, entity_pk, source_row_number, raw_hash FROM entity_evidence",
            )?;
            let mut rows = statement.query([])?;
            while let Some(row) = rows.next()? {
                let entity_kind: String = row.get(0)?;
                let shard_entity_pk: i64 = row.get(1)?;
                let source_row_number: i64 = row.get(2)?;
                let raw_hash: String = row.get(3)?;

                let mapped_entity_pk = match entity_kind.as_str() {
                    "person" => person_id_map.get(&shard_entity_pk).copied(),
                    "company" => company_id_map.get(&shard_entity_pk).copied(),
                    "role" => role_id_map.get(&shard_entity_pk).copied(),
                    _ => None,
                };
                let Some(main_entity_pk) = mapped_entity_pk else {
                    continue;
                };
                insert_evidence.execute(params![
                    entity_kind,
                    main_entity_pk,
                    main_snapshot_id,
                    source_row_number,
                    raw_hash
                ])?;
            }
        }
    }

    tx.commit()?;
    Ok(())
}

fn non_empty(value: Option<String>) -> Option<String> {
    match value {
        Some(inner) if inner.is_empty() => None,
        other => other,
    }
}
