use crate::config::mapping::SourceMapping;
use std::path::PathBuf;
use std::thread;

pub struct ShardIngestConfig<'a> {
    pub db_path: &'a str,
    pub run_id: &'a str,
    pub mapping: &'a SourceMapping,
    pub input_path: &'a str,
    pub snapshot_label: &'a str,
    pub snapshot_date: &'a str,
    pub batch_size: usize,
    pub workers: usize,
    /// Dispatch stops and fails the snapshot once total rows exceed this,
    /// independent of file byte size. Guards against a pathological or
    /// corrupt CSV (e.g. an unescaped embedded newline splitting one row into
    /// many).
    pub max_rows: i64,
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
    /// The `runs/<run_id>` directory holding this run's shard databases.
    /// Nothing deletes it automatically: a long-lived caller that ingests
    /// repeatedly must remove it on both the success and failure paths, or
    /// shards accumulate next to the target database.
    pub run_root: PathBuf,
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
