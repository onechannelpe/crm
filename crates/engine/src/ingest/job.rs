//! Durable ingest job records.
//!
//! Jobs use a dedicated SQLite file because `contacts.sqlite` is replaced by
//! `pipeline promote`, while `leads.sqlite` belongs to a different domain.

use rusqlite::{Connection, OptionalExtension, params};
use serde::Serialize;
use shared::error::StartupError;
use shared::sqlite::SqlitePool;
use std::fmt;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum JobStoreError {
    #[error("ingest job database unavailable: {0}")]
    Unavailable(String),
    #[error("ingest job database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
}

/// Steps a job moves through. Failure is stored in `outcome` so the current
/// step still identifies where the job failed.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum JobStep {
    Queued,
    Staging,
    Gating,
    Merging,
    Validating,
    Materializing,
    Complete,
}

impl JobStep {
    fn as_str(self) -> &'static str {
        match self {
            Self::Queued => "queued",
            Self::Staging => "staging",
            Self::Gating => "gating",
            Self::Merging => "merging",
            Self::Validating => "validating",
            Self::Materializing => "materializing",
            Self::Complete => "complete",
        }
    }
}

impl fmt::Display for JobStep {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum JobOutcome {
    Running,
    Succeeded,
    Failed,
}

impl JobOutcome {
    fn as_str(self) -> &'static str {
        match self {
            Self::Running => "running",
            Self::Succeeded => "succeeded",
            Self::Failed => "failed",
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct JobRecord {
    pub job_id: String,
    pub source_key: String,
    pub snapshot_label: String,
    pub step: String,
    pub outcome: String,
    pub snapshot_id: Option<i64>,
    pub total_rows: Option<i64>,
    pub accepted_rows: Option<i64>,
    pub invalid_doc_rows: Option<i64>,
    pub gate: Option<serde_json::Value>,
    pub error: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Clone)]
pub struct JobStore {
    pool: SqlitePool,
}

impl JobStore {
    pub fn new(pool: SqlitePool) -> Result<Self, StartupError> {
        let conn = pool
            .get()
            .map_err(|e| StartupError::Database(format!("ingest job pool get failed: {e}")))?;

        create_schema(&conn)?;
        drop(conn);

        Ok(Self { pool })
    }

    pub fn insert_queued(
        &self,
        job_id: &str,
        source_key: &str,
        snapshot_label: &str,
    ) -> Result<(), JobStoreError> {
        self.with_connection(|conn| {
            conn.execute(
                "INSERT INTO ingest_job(job_id, source_key, snapshot_label, step, outcome)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    job_id,
                    source_key,
                    snapshot_label,
                    JobStep::Queued.as_str(),
                    JobOutcome::Running.as_str()
                ],
            )?;

            Ok(())
        })
    }

    /// Counts unfinished jobs for the global upload/job capacity limit.
    pub fn count_running(&self) -> Result<i64, JobStoreError> {
        self.with_connection(|conn| {
            let count = conn.query_row(
                "SELECT COUNT(*) FROM ingest_job WHERE outcome = ?1",
                params![JobOutcome::Running.as_str()],
                |row| row.get(0),
            )?;

            Ok(count)
        })
    }

    pub fn set_step(&self, job_id: &str, step: JobStep) -> Result<(), JobStoreError> {
        self.with_connection(|conn| {
            conn.execute(
                "UPDATE ingest_job SET step=?2, updated_at=unixepoch() WHERE job_id=?1",
                params![job_id, step.as_str()],
            )?;

            Ok(())
        })
    }

    pub fn set_snapshot(&self, job_id: &str, snapshot_id: i64) -> Result<(), JobStoreError> {
        self.with_connection(|conn| {
            conn.execute(
                "UPDATE ingest_job SET snapshot_id=?2, updated_at=unixepoch() WHERE job_id=?1",
                params![job_id, snapshot_id],
            )?;

            Ok(())
        })
    }

    pub fn set_counters(
        &self,
        job_id: &str,
        total: i64,
        accepted: i64,
        invalid_doc: i64,
    ) -> Result<(), JobStoreError> {
        self.with_connection(|conn| {
            conn.execute(
                "UPDATE ingest_job
                 SET total_rows=?2, accepted_rows=?3, invalid_doc_rows=?4, updated_at=unixepoch()
                 WHERE job_id=?1",
                params![job_id, total, accepted, invalid_doc],
            )?;

            Ok(())
        })
    }

    pub fn set_gate(&self, job_id: &str, gate_json: &str) -> Result<(), JobStoreError> {
        self.with_connection(|conn| {
            conn.execute(
                "UPDATE ingest_job SET gate_json=?2, updated_at=unixepoch() WHERE job_id=?1",
                params![job_id, gate_json],
            )?;

            Ok(())
        })
    }

    pub fn finish_succeeded(&self, job_id: &str) -> Result<(), JobStoreError> {
        self.with_connection(|conn| {
            conn.execute(
                "UPDATE ingest_job SET step=?2, outcome=?3, updated_at=unixepoch() WHERE job_id=?1",
                params![
                    job_id,
                    JobStep::Complete.as_str(),
                    JobOutcome::Succeeded.as_str()
                ],
            )?;

            Ok(())
        })
    }

    /// Preserve the current step so the record shows where the job failed.
    pub fn finish_failed(&self, job_id: &str, error: &str) -> Result<(), JobStoreError> {
        self.with_connection(|conn| {
            conn.execute(
                "UPDATE ingest_job SET outcome=?2, error=?3, updated_at=unixepoch() WHERE job_id=?1",
                params![job_id, JobOutcome::Failed.as_str(), error],
            )?;

            Ok(())
        })
    }

    pub fn get(&self, job_id: &str) -> Result<Option<JobRecord>, JobStoreError> {
        self.with_connection(|conn| {
            let record = conn
                .query_row(
                    "SELECT job_id, source_key, snapshot_label, step, outcome,
                            snapshot_id, total_rows, accepted_rows, invalid_doc_rows,
                            gate_json, error, created_at, updated_at
                     FROM ingest_job WHERE job_id = ?1",
                    [job_id],
                    read_record,
                )
                .optional()?;

            Ok(record)
        })
    }

    /// Jobs left running after a restart cannot resume, so mark them failed.
    pub fn fail_orphaned_jobs(&self) -> Result<usize, JobStoreError> {
        self.with_connection(|conn| {
            let closed = conn.execute(
                "UPDATE ingest_job
                 SET outcome=?1, error='engine restarted while this job was running',
                     updated_at=unixepoch()
                 WHERE outcome=?2",
                params![JobOutcome::Failed.as_str(), JobOutcome::Running.as_str()],
            )?;

            Ok(closed)
        })
    }

    fn with_connection<T>(
        &self,
        run: impl FnOnce(&Connection) -> Result<T, JobStoreError>,
    ) -> Result<T, JobStoreError> {
        let conn = self
            .pool
            .get()
            .map_err(|e| JobStoreError::Unavailable(e.to_string()))?;

        run(&conn)
    }
}

fn read_record(row: &rusqlite::Row<'_>) -> Result<JobRecord, rusqlite::Error> {
    let gate_json: Option<String> = row.get(9)?;

    Ok(JobRecord {
        job_id: row.get(0)?,
        source_key: row.get(1)?,
        snapshot_label: row.get(2)?,
        step: row.get(3)?,
        outcome: row.get(4)?,
        snapshot_id: row.get(5)?,
        total_rows: row.get(6)?,
        accepted_rows: row.get(7)?,
        invalid_doc_rows: row.get(8)?,
        gate: gate_json.and_then(|raw| serde_json::from_str(&raw).ok()),
        error: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

fn create_schema(conn: &Connection) -> Result<(), StartupError> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS ingest_job (
            job_id           TEXT PRIMARY KEY,
            source_key       TEXT    NOT NULL,
            snapshot_label   TEXT    NOT NULL,
            step             TEXT    NOT NULL,
            outcome          TEXT    NOT NULL,
            snapshot_id      INTEGER,
            total_rows       INTEGER,
            accepted_rows    INTEGER,
            invalid_doc_rows INTEGER,
            gate_json        TEXT,
            error            TEXT,
            created_at       INTEGER NOT NULL DEFAULT (unixepoch()),
            updated_at       INTEGER NOT NULL DEFAULT (unixepoch())
        );

        CREATE INDEX IF NOT EXISTS ingest_job_outcome
            ON ingest_job(outcome, created_at DESC);",
    )
    .map_err(|e| StartupError::Database(format!("failed to create ingest_job table: {e}")))
}
