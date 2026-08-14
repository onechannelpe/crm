//! Online ingest of a staged source file into the live contacts database.
//!
//! Runs in the engine process, alongside search, against the same
//! contacts.sqlite. That is safe because of how the schema is split: search
//! reads only the serving tables, while ingest and merge write only staging
//! tables, so a job is invisible to search until its final materialize step.
//! See `runner` for the ordering and why the gate sits where it does.
//!
//! Concurrency rests on SQLite WAL: the search pool holds read-only
//! connections and this module holds the single writer. `wal::ensure_enabled`
//! must run before the read-only pool opens.

pub mod api;
pub mod contracts;
pub mod job;
pub mod queue;
pub mod runner;
pub mod upload;
pub mod wal;

pub use api::{IngestState, router};
pub use job::JobStore;
