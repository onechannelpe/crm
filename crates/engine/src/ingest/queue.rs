//! FIFO for ingest jobs.
//!
//! A request is accepted immediately and its `JobRequest` waits here until
//! the previous job finishes, rather than the caller retry-looping on a busy
//! response. Capacity is enforced earlier, at `UploadRegistry::reserve` time,
//! so this queue itself is unbounded: nothing can reach it without first
//! clearing that check.

use tokio::sync::mpsc;

use crate::ingest::job::{JobStep, JobStore};
use crate::ingest::runner::{self, JobFailure, JobRequest};

#[derive(Clone)]
pub struct IngestQueue {
    tx: mpsc::UnboundedSender<JobRequest>,
}

impl IngestQueue {
    pub fn new() -> (Self, mpsc::UnboundedReceiver<JobRequest>) {
        let (tx, rx) = mpsc::unbounded_channel();
        (Self { tx }, rx)
    }

    /// Never blocks and never fails from the caller's point of view: a 202
    /// response can be returned the moment this call returns, regardless of
    /// how many jobs are ahead of this one.
    pub fn enqueue(&self, request: JobRequest) {
        // The receiver only drops when the consumer loop exits, which happens
        // only on process shutdown, when there is nothing left to do here.
        let _ = self.tx.send(request);
    }
}

/// Drains queued jobs one at a time, in the order they arrived. A job is only
/// dequeued once the previous one has fully finished (success or failure), so
/// the single SQLite write lock on contacts.sqlite is never contended between
/// two jobs, and no caller ever sees a 409 for it.
pub async fn run_consumer_loop(mut rx: mpsc::UnboundedReceiver<JobRequest>, store: JobStore) {
    while let Some(request) = rx.recv().await {
        let job_id = request.job_id.clone();
        let input_path = request.input_path.clone();
        let run_store = store.clone();

        let outcome = tokio::task::spawn_blocking(move || runner::run(&run_store, &request)).await;
        record_outcome(&store, &job_id, outcome);

        if let Err(err) = tokio::fs::remove_file(&input_path).await {
            tracing::warn!(
                %job_id,
                path = %input_path,
                %err,
                "could not remove uploaded file after job completion"
            );
        }
    }
}

fn record_outcome(
    store: &JobStore,
    job_id: &str,
    outcome: Result<Result<(), JobFailure>, tokio::task::JoinError>,
) {
    match outcome {
        Ok(Ok(())) => {
            if let Err(err) = store.finish_succeeded(job_id) {
                tracing::error!(%job_id, %err, "could not record job success");
            }
            tracing::info!(%job_id, "ingest job complete");
        }
        Ok(Err(JobFailure::GateRejected(gate))) => {
            let reasons = gate
                .checks
                .iter()
                .filter(|check| !check.passed)
                .map(|check| check.message.as_str())
                .collect::<Vec<_>>()
                .join("; ");
            record_failure(
                store,
                job_id,
                Some(JobStep::Gating),
                &format!("gate rejected the snapshot: {reasons}"),
            );
        }
        Ok(Err(JobFailure::Step { step, message })) => {
            record_failure(store, job_id, Some(step), &message);
        }
        // A panic mid-phase leaves the job's `step` column at whatever the
        // last successful `set_step` call left it, which is still accurate.
        // Forcing it to a guessed value here would be a lie.
        Err(join_err) => {
            record_failure(
                store,
                job_id,
                None,
                &format!("ingest job panicked: {join_err}"),
            );
        }
    }
}

fn record_failure(store: &JobStore, job_id: &str, step: Option<JobStep>, message: &str) {
    tracing::error!(%job_id, ?step, %message, "ingest job failed");
    if let Some(step) = step
        && let Err(err) = store.set_step(job_id, step)
    {
        tracing::error!(%job_id, %err, "could not record failing step");
    }
    if let Err(err) = store.finish_failed(job_id, message) {
        tracing::error!(%job_id, %err, "could not record job failure");
    }
}
