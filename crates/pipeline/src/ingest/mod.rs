//! Sharded CSV ingestion.
//!
//! This module owns turning one source snapshot into shard databases. Dispatch
//! reads source records, workers normalize and stage rows, and snapshot records
//! track progress in the main database.

mod dispatcher;
mod session;
mod snapshot;
mod worker;

pub use dispatcher::map_snapshot_only;
pub use session::{IngestCounters, IngestSession, ShardIngestConfig, ShardResult};

use crate::PipelineError;
use dispatcher::{dispatch_records, resolve_mapping_for_path};
use session::ShardWorkerResult;
use snapshot::{mark_snapshot_failed, register_snapshot, sanitize_path_component};
use std::fs;
use std::path::Path;
use worker::spawn_workers;

const MAX_SHARDED_WORKERS: usize = 64;

pub fn ingest_to_shards(config: ShardIngestConfig<'_>) -> Result<IngestSession, PipelineError> {
    let ShardIngestConfig {
        db_path,
        run_id,
        mapping,
        input_path,
        snapshot_label,
        snapshot_date,
        batch_size,
        workers,
        max_rows,
    } = config;

    if !Path::new(input_path).exists() {
        return Err(PipelineError::Args(format!(
            "input path does not exist: {input_path}"
        )));
    }

    let workers = workers.clamp(1, MAX_SHARDED_WORKERS);
    println!("[pipeline] ingest mode=sharded workers={workers}");

    let resolved_mapping = resolve_mapping_for_path(mapping, input_path)?;
    let snapshot_id =
        register_snapshot(db_path, mapping, input_path, snapshot_label, snapshot_date)?;

    let run_root = Path::new(db_path)
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join("runs")
        .join(sanitize_path_component(run_id));
    let shard_root = run_root
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

    let dispatch_result = dispatch_records(mapping, input_path, workers, &task_senders, max_rows);
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
        let worker_result = join_worker(handle, db_path, snapshot_id)?;
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
        source_key: mapping.source_key.clone(),
        counters,
        dispatched_rows,
        run_root,
        shard_results,
    })
}

fn join_worker(
    handle: session::WorkerHandle,
    db_path: &str,
    snapshot_id: i64,
) -> Result<ShardWorkerResult, PipelineError> {
    match handle.join() {
        Ok(Ok(worker_result)) => Ok(worker_result),
        Ok(Err(err)) => {
            mark_snapshot_failed(db_path, snapshot_id)?;
            Err(PipelineError::Args(err))
        }
        Err(_) => {
            mark_snapshot_failed(db_path, snapshot_id)?;
            Err(PipelineError::Args(
                "sharded ingest worker panicked".to_owned(),
            ))
        }
    }
}
