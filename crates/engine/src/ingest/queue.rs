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

    pub fn enqueue(&self, request: JobRequest) {
        let _ = self.tx.send(request);
    }
}

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

        // Preserve the last recorded step instead of guessing where the panic happened.
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
