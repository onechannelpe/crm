use crate::PipelineError;
use crate::config::mapping::SourceMapping;
use crate::db::repo;
use crate::db::schema::open_rw;
use crate::domain::canonical;
use crate::stages::shard_ingest::types::{
    IngestCounters, IngestSession, ShardIngestConfig, ShardResult, ShardTask, WorkerHandle,
    sanitize_path_component,
};
use crate::stages::shard_ingest::worker::run_shard_worker;
use csv::ReaderBuilder;
use std::fs;
use std::path::Path;
use std::sync::mpsc::{self, SyncSender};
use std::thread;

const MAX_SHARDED_WORKERS: usize = 64;

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

    let resolved_mapping = resolve_mapping(&mapping, input_path)?;
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

fn resolve_mapping(
    mapping: &SourceMapping,
    input_path: &str,
) -> Result<canonical::ResolvedMapping, PipelineError> {
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
    canonical::resolve_mapping(mapping, headers.as_ref())
}

fn register_snapshot(
    db_path: &str,
    mapping: &SourceMapping,
    input_path: &str,
    snapshot_label: &str,
    snapshot_date: &str,
    reliability_rank: i64,
) -> Result<i64, PipelineError> {
    let mut conn = open_rw(db_path)?;
    let tx = conn.transaction()?;
    let snapshot_id = repo::upsert_snapshot(
        &tx,
        &mapping.source_key,
        &mapping.source_name,
        snapshot_label,
        snapshot_date,
        input_path,
        reliability_rank,
    )?;
    repo::set_snapshot_status(&tx, snapshot_id, "loading")?;
    tx.commit()?;
    Ok(snapshot_id)
}

fn spawn_workers(
    workers: usize,
    shard_root: &Path,
    mapping: SourceMapping,
    resolved_mapping: canonical::ResolvedMapping,
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
    }
    Ok(total_rows)
}

fn mark_snapshot_failed(db_path: &str, snapshot_id: i64) -> Result<(), PipelineError> {
    use crate::db::repo;
    let mut conn = open_rw(db_path)?;
    let tx = conn.transaction()?;
    repo::set_snapshot_status(&tx, snapshot_id, "failed")?;
    tx.commit()?;
    Ok(())
}
