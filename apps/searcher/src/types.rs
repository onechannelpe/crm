//! Type definitions for phone lookup system
//! 
//! Defines core data structures used throughout the API.
//! Simple, explicit types following the maintainability principle.

use serde::Serialize;
use std::collections::HashMap;

/// Core phone record structure
/// One record per unique DNI after deduplication
#[derive(Debug, Clone)]
pub struct PhoneRecord {
    pub dni: String,
    pub ruc: Option<String>,
    pub phones: Vec<String>,
    pub operators: Vec<String>,
}

/// Lookup response sent to API clients
#[derive(Debug, Serialize)]
pub struct LookupResponse {
    pub query: String,
    pub query_type: String,
    pub found: bool,
    pub results: Vec<LookupResult>,
    pub count: usize,
}

/// Individual result within a lookup response
#[derive(Debug, Clone, Serialize)]
pub struct LookupResult {
    pub dni: String,
    pub ruc: Option<String>,
    pub phones: Vec<String>,
    pub operators: Vec<String>,
}

/// Service statistics for monitoring
#[derive(Debug, Clone, Serialize)]
pub struct ServiceStats {
    pub total_records: usize,
    pub unique_dnis: usize,
    pub unique_rucs: usize,
    pub unique_phones: usize,
    pub memory_mb: f64,
    pub startup_time_seconds: f64,
}

/// Type alias for lookup indexes
/// HashMap provides O(1) average case lookup performance
pub type LookupIndex = HashMap<String, Vec<usize>>;
