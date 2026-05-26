use std::path::PathBuf;
use std::thread;

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
    pub shard_db_path: PathBuf,
}

pub struct IngestSession {
    pub snapshot_id: i64,
    pub source_key: String,
    pub counters: IngestCounters,
    pub dispatched_rows: i64,
    pub shard_results: Vec<ShardResult>,
}

pub(super) struct ShardTask {
    pub source_row_number: i64,
    pub record: csv::StringRecord,
}

pub(super) struct ShardWorkerResult {
    pub shard_index: usize,
    pub shard_db_path: PathBuf,
    pub counters: IngestCounters,
}

pub(super) type WorkerHandle = thread::JoinHandle<Result<ShardWorkerResult, String>>;

#[derive(Default)]
pub(super) struct StageRow {
    pub source_row_number: i64,
    pub person_dni: Option<String>,
    pub person_natural_ruc: Option<String>,
    pub person_full_name: String,
    pub email: Option<String>,
    pub company_ruc: Option<String>,
    pub company_name: String,
    pub role_name: String,
    pub role_start_date: String,
    pub rep_doc_type: String,
    pub rep_doc_number: String,
    pub rep_name: String,
    pub phones: Vec<String>,
    pub had_phone_input: bool,
    pub raw_hash: String,
    pub company_status: String,
    pub company_condition: String,
    pub company_type: String,
    pub economic_activity: String,
    pub company_ubigeo: String,
    pub company_department: String,
    pub company_province: String,
    pub company_district: String,
}

pub(super) fn sanitize_path_component(value: &str) -> String {
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
