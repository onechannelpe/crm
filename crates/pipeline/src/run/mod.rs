//! Pipeline run orchestration.
//!
//! Run modes compose source selection, ingest/merge/validate phases,
//! materialization, and run metadata. Each mode owns only its control flow;
//! phase implementation details live in `phase`.

pub mod context;
pub mod full;
pub mod matrix;
mod phase;
mod sources;
