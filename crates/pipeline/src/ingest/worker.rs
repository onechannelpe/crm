use crate::PipelineError;
use crate::config::mapping::SourceMapping;
use crate::normalize::{self, ResolvedMapping, hash_record};
use rusqlite::{Connection, params};
use std::fs;
use std::path::Path;
use std::sync::mpsc::{self, SyncSender};
use std::thread;

use super::session::{IngestCounters, ShardTask, ShardWorkerResult, WorkerHandle};

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

pub(super) fn spawn_workers(
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
        let row = normalize::normalize_row(&resolved_mapping, &task.record);

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
