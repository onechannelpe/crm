//! Executes one ingest job against the live contacts database.
//!
//! Ingest and merge write staging tables. Search sees changes only after
//! `materialize_serving`, so the gate runs before merge while rejection is
//! still lossless.
//!
//! The staging/serving split provides isolation without copying contacts.sqlite.

use pipeline::config::mapping::SourceMapping;
use pipeline::gate::{GateResult, gate_staged_snapshot};
use pipeline::ingest::{IngestSession, ShardIngestConfig, ingest_to_shards};
use pipeline::materialize::materialize_serving;
use pipeline::merge::merge_ingest_session;
use pipeline::merge::snapshot::{mark_snapshot_failed, record_snapshot_status};
use pipeline::validate::validate_snapshot;
use std::fs;
use std::path::Path;

use crate::ingest::job::{JobStep, JobStore};

/// Host-level pipeline tuning, fixed at startup.
#[derive(Debug, Clone, Copy)]
pub struct RunSettings {
    pub workers: usize,
    pub batch_size: usize,
    pub max_rows: i64,
}

pub struct JobRequest {
    pub job_id: String,
    pub contacts_db_path: String,
    pub mapping: SourceMapping,
    pub input_path: String,
    pub snapshot_label: String,
    pub snapshot_date: String,
    pub settings: RunSettings,
}

/// Gate rejection is a valid refusal; step failures are operational errors.
pub enum JobFailure {
    GateRejected(GateResult),
    Step { step: JobStep, message: String },
}

pub fn run(store: &JobStore, request: &JobRequest) -> Result<(), JobFailure> {
    let session = stage(store, request)?;
    let snapshot_id = session.snapshot_id;

    let gate = gate_staged_snapshot(&request.mapping.source_key, &session.counters);
    record_gate(store, &request.job_id, &gate);

    if !gate.passed {
        remove_run_root(&session.run_root);

        if let Err(err) = mark_snapshot_failed(&request.contacts_db_path, snapshot_id) {
            tracing::warn!(job_id = %request.job_id, %err, "could not mark snapshot failed");
        }

        return Err(JobFailure::GateRejected(gate));
    }

    merge(store, request, session)?;
    validate(store, request, snapshot_id)?;
    materialize(store, request, snapshot_id)?;

    Ok(())
}

fn stage(store: &JobStore, request: &JobRequest) -> Result<IngestSession, JobFailure> {
    set_step(store, &request.job_id, JobStep::Staging);

    let session = ingest_to_shards(ShardIngestConfig {
        db_path: &request.contacts_db_path,

        // Keep shard directories traceable to their job.
        run_id: &request.job_id,

        mapping: &request.mapping,
        input_path: &request.input_path,
        snapshot_label: &request.snapshot_label,
        snapshot_date: &request.snapshot_date,
        batch_size: request.settings.batch_size,
        workers: request.settings.workers,
        max_rows: request.settings.max_rows,
    })
    .map_err(|err| JobFailure::Step {
        step: JobStep::Staging,
        message: err.to_string(),
    })?;

    if let Err(err) = store.set_snapshot(&request.job_id, session.snapshot_id) {
        tracing::warn!(job_id = %request.job_id, %err, "could not record snapshot id");
    }

    if let Err(err) = store.set_counters(
        &request.job_id,
        session.counters.total_rows,
        session.counters.accepted_rows,
        session.counters.invalid_doc_rows,
    ) {
        tracing::warn!(job_id = %request.job_id, %err, "could not record counters");
    }

    set_step(store, &request.job_id, JobStep::Gating);

    Ok(session)
}

fn merge(store: &JobStore, request: &JobRequest, session: IngestSession) -> Result<(), JobFailure> {
    set_step(store, &request.job_id, JobStep::Merging);

    let run_root = session.run_root.clone();
    let result = merge_ingest_session(&request.contacts_db_path, session);

    remove_run_root(&run_root);

    result.map(|_| ()).map_err(|err| JobFailure::Step {
        step: JobStep::Merging,
        message: err.to_string(),
    })
}

fn validate(store: &JobStore, request: &JobRequest, snapshot_id: i64) -> Result<(), JobFailure> {
    set_step(store, &request.job_id, JobStep::Validating);

    validate_snapshot(&request.contacts_db_path, &request.snapshot_label).map_err(|err| {
        JobFailure::Step {
            step: JobStep::Validating,
            message: err.to_string(),
        }
    })?;

    record_snapshot_status(&request.contacts_db_path, snapshot_id, "validated").map_err(|err| {
        JobFailure::Step {
            step: JobStep::Validating,
            message: err.to_string(),
        }
    })
}

fn materialize(store: &JobStore, request: &JobRequest, snapshot_id: i64) -> Result<(), JobFailure> {
    set_step(store, &request.job_id, JobStep::Materializing);

    // First step visible to search. Interrupted runs leave remaining dirty ids
    // queued for the next call.
    materialize_serving(&request.contacts_db_path).map_err(|err| JobFailure::Step {
        step: JobStep::Materializing,
        message: err.to_string(),
    })?;

    record_snapshot_status(&request.contacts_db_path, snapshot_id, "materialized").map_err(|err| {
        JobFailure::Step {
            step: JobStep::Materializing,
            message: err.to_string(),
        }
    })
}

/// Removes shard databases left behind by the pipeline.
fn remove_run_root(run_root: &Path) {
    if let Err(err) = fs::remove_dir_all(run_root) {
        tracing::warn!(path = %run_root.display(), %err, "could not remove run directory");
    }
}

fn record_gate(store: &JobStore, job_id: &str, gate: &GateResult) {
    match serde_json::to_string(gate) {
        Ok(json) => {
            if let Err(err) = store.set_gate(job_id, &json) {
                tracing::warn!(%job_id, %err, "could not record gate result");
            }
        }
        Err(err) => tracing::warn!(%job_id, %err, "could not serialize gate result"),
    }
}

fn set_step(store: &JobStore, job_id: &str, step: JobStep) {
    tracing::info!(%job_id, %step, "ingest job step");

    if let Err(err) = store.set_step(job_id, step) {
        tracing::warn!(%job_id, %err, "could not record job step");
    }
}
