//! Ingests staged source files into the live contacts database.
//!
//! Ordering matters: search only sees a job's data after materialize runs.
//! See `runner` for why.
//!
//! Concurrency relies on SQLite WAL. See `wal` for why.

pub mod contracts;
pub mod job;
pub mod queue;
pub mod runner;
pub mod wal;

pub use job::JobStore;
