use crate::PipelineError;
use crate::config::mapping::SourceMapping;
use crate::domain::canonical;
use crate::domain::record_hash::hash_record;
use crate::stages::shard_ingest::types::{IngestCounters, ShardTask, ShardWorkerResult, StageRow};
use rusqlite::{Connection, params};
use std::fs;
use std::path::PathBuf;
use std::sync::mpsc::Receiver;

pub(super) fn run_shard_worker(
    worker_index: usize,
    shard_db_path: PathBuf,
    mapping: SourceMapping,
    resolved_mapping: canonical::ResolvedMapping,
    batch_size: usize,
    rx: Receiver<ShardTask>,
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
            company_ruc TEXT,
            company_name TEXT NOT NULL,
            role_name TEXT NOT NULL,
            role_start_date TEXT NOT NULL,
            rep_doc_type TEXT NOT NULL,
            rep_doc_number TEXT NOT NULL,
            rep_name TEXT NOT NULL,
            phones_json TEXT NOT NULL,
            had_phone_input INTEGER NOT NULL,
            raw_hash TEXT NOT NULL
        );
        "#,
    )?;

    let mut counters = IngestCounters::default();
    let mut tx = conn.transaction()?;
    let mut insert_stage = tx.prepare_cached(
        r#"
        INSERT INTO stage_rows(
            source_row_number,
            person_dni,
            person_natural_ruc,
            person_full_name,
            company_ruc,
            company_name,
            role_name,
            role_start_date,
            rep_doc_type,
            rep_doc_number,
            rep_name,
            phones_json,
            had_phone_input,
            raw_hash
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
        "#,
    )?;

    let mut processed_in_batch = 0usize;
    while let Ok(task) = rx.recv() {
        counters.total_rows += 1;
        let canonical_row = canonical::map_record(&resolved_mapping, &task.record);
        let stage_row = StageRow {
            source_row_number: task.source_row_number,
            raw_hash: hash_record(&task.record, mapping.delimiter.as_str()),
            person_dni: canonical_row.person_dni,
            person_natural_ruc: canonical_row.person_natural_ruc,
            person_full_name: canonical_row.person_full_name,
            company_ruc: canonical_row.company_ruc,
            company_name: canonical_row.company_name,
            role_name: canonical_row.role_name,
            role_start_date: canonical_row.role_start_date,
            rep_doc_type: canonical_row.rep_doc_type,
            rep_doc_number: canonical_row.rep_doc_number,
            rep_name: canonical_row.rep_name,
            phones: canonical_row.phones,
            had_phone_input: canonical_row.had_phone_input,
        };

        if !stage_row.rep_doc_number.is_empty()
            && stage_row.person_dni.is_none()
            && stage_row.rep_doc_type.eq_ignore_ascii_case("DNI")
        {
            counters.invalid_dni_rows += 1;
        }

        if stage_row.person_dni.is_none()
            && stage_row.company_ruc.is_none()
            && stage_row.role_name.is_empty()
            && stage_row.rep_doc_number.is_empty()
            && stage_row.phones.is_empty()
        {
            if stage_row.company_ruc.is_none() && !stage_row.company_name.is_empty() {
                counters.invalid_ruc_rows += 1;
            }
            continue;
        }

        if stage_row.had_phone_input && stage_row.phones.is_empty() {
            counters.invalid_phone_rows += 1;
        }

        counters.accepted_rows += 1;
        let phones_json = serde_json::to_string(&stage_row.phones)
            .map_err(|err| PipelineError::Args(format!("failed to serialize phones: {err}")))?;
        insert_stage.execute(params![
            stage_row.source_row_number,
            stage_row.person_dni,
            stage_row.person_natural_ruc,
            stage_row.person_full_name,
            stage_row.company_ruc,
            stage_row.company_name,
            stage_row.role_name,
            stage_row.role_start_date,
            stage_row.rep_doc_type,
            stage_row.rep_doc_number,
            stage_row.rep_name,
            phones_json,
            if stage_row.had_phone_input { 1 } else { 0 },
            stage_row.raw_hash,
        ])?;

        processed_in_batch += 1;
        if processed_in_batch >= batch_size {
            drop(insert_stage);
            tx.commit()?;
            tx = conn.transaction()?;
            insert_stage = tx.prepare_cached(
                r#"
                INSERT INTO stage_rows(
                    source_row_number,
                    person_dni,
                    person_natural_ruc,
                    person_full_name,
                    company_ruc,
                    company_name,
                    role_name,
                    role_start_date,
                    rep_doc_type,
                    rep_doc_number,
                    rep_name,
                    phones_json,
                    had_phone_input,
                    raw_hash
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
                "#,
            )?;
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
