use crate::PipelineError;
use crate::config::mapping::SourceMapping;
use crate::merge;
use crate::normalize::{self, ResolvedMapping, hash_record};
use csv::ReaderBuilder;
use rusqlite::{Connection, params};
use std::fs;
use std::path::Path;
use std::sync::mpsc::{self, SyncSender};
use std::thread;

const MAX_SHARDED_WORKERS: usize = 64;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

pub struct ShardIngestConfig<'a> {
    pub db_path: &'a str,
    pub run_id: &'a str,
    pub mapping_path: &'a str,
    pub input_path: &'a str,
    pub snapshot_label: &'a str,
    pub snapshot_date: &'a str,
    pub reliability_rank: i64,
    pub batch_size: usize,
    pub workers: usize,
}

#[derive(Default, Clone)]
pub struct IngestCounters {
    pub total_rows: i64,
    pub accepted_rows: i64,
    pub invalid_doc_rows: i64,
    pub invalid_ruc_rows: i64,
    pub invalid_phone_rows: i64,
}

impl IngestCounters {
    pub fn add_from(&mut self, other: &IngestCounters) {
        self.total_rows += other.total_rows;
        self.accepted_rows += other.accepted_rows;
        self.invalid_doc_rows += other.invalid_doc_rows;
        self.invalid_ruc_rows += other.invalid_ruc_rows;
        self.invalid_phone_rows += other.invalid_phone_rows;
    }
}

pub struct ShardResult {
    pub shard_index: usize,
    pub shard_db_path: std::path::PathBuf,
}

pub struct IngestSession {
    pub snapshot_id: i64,
    pub source_key: String,
    pub counters: IngestCounters,
    pub dispatched_rows: i64,
    pub shard_results: Vec<ShardResult>,
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

pub fn ingest_to_shards(config: ShardIngestConfig<'_>) -> Result<IngestSession, PipelineError> {
    let ShardIngestConfig {
        db_path,
        run_id,
        mapping_path,
        input_path,
        snapshot_label,
        snapshot_date,
        reliability_rank,
        batch_size,
        workers,
    } = config;

    if !Path::new(input_path).exists() {
        return Err(PipelineError::Args(format!(
            "input path does not exist: {input_path}"
        )));
    }

    let mapping = SourceMapping::from_path(mapping_path)?;
    let workers = workers.clamp(1, MAX_SHARDED_WORKERS);
    println!("[pipeline] ingest mode=sharded workers={workers}");

    let resolved_mapping = resolve_mapping_for_path(&mapping, input_path)?;
    let snapshot_id = register_snapshot(
        db_path,
        &mapping,
        input_path,
        snapshot_label,
        snapshot_date,
        reliability_rank,
    )?;

    let shard_root = Path::new(db_path)
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join("runs")
        .join(sanitize_path_component(run_id))
        .join("staging")
        .join(sanitize_path_component(&mapping.source_key))
        .join(sanitize_path_component(snapshot_label))
        .join("shards");

    if shard_root.exists() {
        fs::remove_dir_all(&shard_root)?;
    }
    fs::create_dir_all(&shard_root)?;

    let (task_senders, handles) = spawn_workers(
        workers,
        &shard_root,
        mapping.clone(),
        resolved_mapping,
        batch_size,
    );

    let dispatch_result = dispatch_records(&mapping, input_path, workers, &task_senders);
    drop(task_senders);

    let dispatched_rows = match dispatch_result {
        Ok(total_rows) => total_rows,
        Err(err) => {
            for handle in handles {
                let _ = handle.join();
            }
            mark_snapshot_failed(db_path, snapshot_id)?;
            return Err(err);
        }
    };

    let mut worker_results = Vec::with_capacity(workers);
    for handle in handles {
        let worker_result = match handle.join() {
            Ok(Ok(worker_result)) => worker_result,
            Ok(Err(err)) => {
                mark_snapshot_failed(db_path, snapshot_id)?;
                return Err(PipelineError::Args(err));
            }
            Err(_) => {
                mark_snapshot_failed(db_path, snapshot_id)?;
                return Err(PipelineError::Args(
                    "sharded ingest worker panicked".to_owned(),
                ));
            }
        };
        worker_results.push(worker_result);
    }
    worker_results.sort_by_key(|result| result.shard_index);

    let mut counters = IngestCounters::default();
    let mut shard_results = Vec::with_capacity(workers);
    for worker_result in worker_results {
        counters.add_from(&worker_result.counters);
        shard_results.push(ShardResult {
            shard_index: worker_result.shard_index,
            shard_db_path: worker_result.shard_db_path,
        });
    }

    Ok(IngestSession {
        snapshot_id,
        source_key: mapping.source_key,
        counters,
        dispatched_rows,
        shard_results,
    })
}

/// Dry-run: maps every record through the normalize step without writing anything.
pub fn map_snapshot_only(mapping_path: &str, input_path: &str) -> Result<usize, PipelineError> {
    if !Path::new(input_path).exists() {
        return Err(PipelineError::Args(format!(
            "input path does not exist: {input_path}"
        )));
    }

    let mapping = SourceMapping::from_path(mapping_path)?;
    let mut reader = ReaderBuilder::new()
        .delimiter(mapping.delimiter_byte())
        .has_headers(mapping.has_header)
        .flexible(mapping.flexible)
        .from_path(input_path)?;

    let headers = if mapping.has_header {
        let byte_headers = reader.byte_headers()?.clone();
        Some(mapping.decode_byte_record(&byte_headers)?)
    } else {
        None
    };
    let resolved_mapping = normalize::resolve_mapping(&mapping, headers.as_ref())?;

    let mut total_rows = 0usize;
    for result in reader.byte_records() {
        let byte_record = result?;
        let record = mapping.decode_byte_record(&byte_record)?;
        let _row = normalize::map_record(&resolved_mapping, &record);
        total_rows += 1;
    }
    Ok(total_rows)
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

struct ShardTask {
    source_row_number: i64,
    record: csv::StringRecord,
}

struct ShardWorkerResult {
    shard_index: usize,
    shard_db_path: std::path::PathBuf,
    counters: IngestCounters,
}

type WorkerHandle = thread::JoinHandle<Result<ShardWorkerResult, String>>;

fn resolve_mapping_for_path(
    mapping: &SourceMapping,
    input_path: &str,
) -> Result<ResolvedMapping, PipelineError> {
    let mut header_reader = ReaderBuilder::new()
        .delimiter(mapping.delimiter_byte())
        .has_headers(mapping.has_header)
        .flexible(mapping.flexible)
        .from_path(input_path)?;
    let headers = if mapping.has_header {
        let byte_headers = header_reader.byte_headers()?.clone();
        Some(mapping.decode_byte_record(&byte_headers)?)
    } else {
        None
    };
    normalize::resolve_mapping(mapping, headers.as_ref())
}

fn register_snapshot(
    db_path: &str,
    mapping: &SourceMapping,
    input_path: &str,
    snapshot_label: &str,
    snapshot_date: &str,
    reliability_rank: i64,
) -> Result<i64, PipelineError> {
    let mut conn = crate::schema::open_rw(db_path)?;
    let tx = conn.transaction()?;
    let snapshot_id = merge::upsert_snapshot(
        &tx,
        &mapping.source_key,
        &mapping.source_name,
        snapshot_label,
        snapshot_date,
        input_path,
        reliability_rank,
    )?;
    merge::set_snapshot_status(&tx, snapshot_id, "loading")?;
    tx.commit()?;
    Ok(snapshot_id)
}

fn spawn_workers(
    workers: usize,
    shard_root: &Path,
    mapping: SourceMapping,
    resolved_mapping: ResolvedMapping,
    batch_size: usize,
) -> (Vec<SyncSender<ShardTask>>, Vec<WorkerHandle>) {
    let mut task_senders: Vec<SyncSender<ShardTask>> = Vec::with_capacity(workers);
    let mut handles = Vec::with_capacity(workers);

    for worker_index in 0..workers {
        let (tx, rx) = mpsc::sync_channel::<ShardTask>(4096);
        task_senders.push(tx);

        let shard_db_path = shard_root.join(format!("shard-{worker_index:02}.sqlite"));
        let worker_mapping = mapping.clone();
        let worker_resolved = resolved_mapping.clone();

        handles.push(thread::spawn(move || {
            run_shard_worker(
                worker_index,
                shard_db_path,
                worker_mapping,
                worker_resolved,
                batch_size,
                rx,
            )
            .map_err(|err| err.to_string())
        }));
    }

    (task_senders, handles)
}

fn dispatch_records(
    mapping: &SourceMapping,
    input_path: &str,
    workers: usize,
    task_senders: &[SyncSender<ShardTask>],
) -> Result<i64, PipelineError> {
    let mut reader = ReaderBuilder::new()
        .delimiter(mapping.delimiter_byte())
        .has_headers(mapping.has_header)
        .flexible(mapping.flexible)
        .from_path(input_path)?;

    if mapping.has_header {
        let _ = reader.byte_headers()?;
    }

    let mut total_rows = 0i64;
    for (i, result) in reader.byte_records().enumerate() {
        let byte_record = result?;
        let record = mapping.decode_byte_record(&byte_record)?;
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
    }
    Ok(total_rows)
}

fn mark_snapshot_failed(db_path: &str, snapshot_id: i64) -> Result<(), PipelineError> {
    let mut conn = crate::schema::open_rw(db_path)?;
    let tx = conn.transaction()?;
    merge::set_snapshot_status(&tx, snapshot_id, "failed")?;
    tx.commit()?;
    Ok(())
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

// ---------------------------------------------------------------------------
// Shard worker
// ---------------------------------------------------------------------------

const INSERT_STAGE_ROW_SQL: &str = r#"
INSERT INTO stage_rows(
    source_row_number,
    person_dni,
    person_natural_ruc,
    person_full_name,
    email,
    company_ruc,
    company_name,
    role_name,
    role_start_date,
    rep_doc_type,
    rep_doc_number,
    rep_name,
    phones_json,
    had_phone_input,
    raw_hash,
    company_status,
    company_condition,
    company_type,
    economic_activity,
    company_ubigeo,
    company_department,
    company_province,
    company_district
) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)
"#;

fn run_shard_worker(
    worker_index: usize,
    shard_db_path: std::path::PathBuf,
    mapping: SourceMapping,
    resolved_mapping: ResolvedMapping,
    batch_size: usize,
    rx: std::sync::mpsc::Receiver<ShardTask>,
) -> Result<ShardWorkerResult, PipelineError> {
    if shard_db_path.exists() {
        fs::remove_file(&shard_db_path)?;
    }

    let mut conn = Connection::open(&shard_db_path)?;
    conn.execute_batch(
        r#"
        PRAGMA journal_mode=WAL;
        PRAGMA synchronous=NORMAL;
        PRAGMA temp_store=MEMORY;
        CREATE TABLE stage_rows (
            source_row_number INTEGER NOT NULL,
            person_dni TEXT,
            person_natural_ruc TEXT,
            person_full_name TEXT NOT NULL,
            email TEXT,
            company_ruc TEXT,
            company_name TEXT NOT NULL,
            role_name TEXT NOT NULL,
            role_start_date TEXT NOT NULL,
            rep_doc_type TEXT NOT NULL,
            rep_doc_number TEXT NOT NULL,
            rep_name TEXT NOT NULL,
            phones_json TEXT NOT NULL,
            had_phone_input INTEGER NOT NULL,
            raw_hash TEXT NOT NULL,
            company_status TEXT NOT NULL,
            company_condition TEXT NOT NULL,
            company_type TEXT NOT NULL,
            economic_activity TEXT NOT NULL,
            company_ubigeo TEXT NOT NULL,
            company_department TEXT NOT NULL,
            company_province TEXT NOT NULL,
            company_district TEXT NOT NULL
        );
        "#,
    )?;

    let mut counters = IngestCounters::default();
    let mut tx = conn.transaction()?;
    let mut insert_stage = tx.prepare_cached(INSERT_STAGE_ROW_SQL)?;
    let mut processed_in_batch = 0usize;

    while let Ok(task) = rx.recv() {
        counters.total_rows += 1;
        let row = normalize::map_record(&resolved_mapping, &task.record);

        if row.had_rep_doc_input && row.rep_doc_type.is_empty() {
            counters.invalid_doc_rows += 1;
        }

        if row.person_dni.is_none()
            && row.company_ruc.is_none()
            && row.role_name.is_empty()
            && row.rep_doc_number.is_empty()
            && row.phones.is_empty()
        {
            if row.company_ruc.is_none() && !row.company_name.is_empty() {
                counters.invalid_ruc_rows += 1;
            }
            continue;
        }

        if row.had_phone_input && row.phones.is_empty() {
            counters.invalid_phone_rows += 1;
        }

        counters.accepted_rows += 1;
        let phones_json = serde_json::to_string(&row.phones)
            .map_err(|err| PipelineError::Args(format!("failed to serialize phones: {err}")))?;
        let raw_hash = hash_record(&task.record, mapping.delimiter.as_str());

        insert_stage.execute(params![
            task.source_row_number,
            row.person_dni,
            row.person_natural_ruc,
            row.person_full_name,
            row.email,
            row.company_ruc,
            row.company_name,
            row.role_name,
            row.role_start_date,
            row.rep_doc_type,
            row.rep_doc_number,
            row.rep_name,
            phones_json,
            if row.had_phone_input { 1 } else { 0 },
            raw_hash,
            row.company_status,
            row.company_condition,
            row.company_type,
            row.economic_activity,
            row.company_ubigeo,
            row.company_department,
            row.company_province,
            row.company_district,
        ])?;

        processed_in_batch += 1;
        if processed_in_batch >= batch_size {
            drop(insert_stage);
            tx.commit()?;
            tx = conn.transaction()?;
            insert_stage = tx.prepare_cached(INSERT_STAGE_ROW_SQL)?;
            processed_in_batch = 0;
        }
    }

    drop(insert_stage);
    tx.commit()?;

    Ok(ShardWorkerResult {
        shard_index: worker_index,
        shard_db_path,
        counters,
    })
}
