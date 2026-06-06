//! Database storage primitives for the pipeline.
//!
//! `schema` owns the durable SQLite contract. `db` owns connection setup and
//! runtime pragmas used by readers and writers.

pub mod db;
pub mod schema;
