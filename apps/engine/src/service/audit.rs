use chrono::{DateTime, Utc};
use dashmap::DashMap;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::VecDeque;

const MAX_LOGS_PER_USER: usize = 1000;

pub struct AuditLog {
    logs: DashMap<i64, VecDeque<SearchEntry>>,
    assignments: DashMap<usize, AssignmentEntry>,
}

#[derive(Clone, Serialize)]
pub struct SearchEntry {
    pub search_type: String,
    pub query_hash: String,
    pub timestamp: DateTime<Utc>,
    pub results_count: usize,
}

#[derive(Clone, Serialize)]
pub struct AssignmentEntry {
    pub lead_id: usize,
    pub assigned_to: i64,
    pub assigned_by: i64,
    pub assigned_at: DateTime<Utc>,
}

impl Default for AuditLog {
    fn default() -> Self {
        Self {
            logs: DashMap::new(),
            assignments: DashMap::new(),
        }
    }
}

impl AuditLog {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn log_search(&self, user_id: i64, search_type: &str, query: &str, results_count: usize) {
        let entry = SearchEntry {
            search_type: search_type.to_string(),
            query_hash: Self::hash_query(query),
            timestamp: Utc::now(),
            results_count,
        };

        self.logs.entry(user_id).or_default().push_back(entry);

        if let Some(mut logs) = self.logs.get_mut(&user_id)
            && logs.len() > MAX_LOGS_PER_USER
        {
            logs.pop_front();
        }
    }

    pub fn log_assignment(&self, lead_id: usize, assigned_to: i64, assigned_by: i64) {
        self.assignments.insert(
            lead_id,
            AssignmentEntry {
                lead_id,
                assigned_to,
                assigned_by,
                assigned_at: Utc::now(),
            },
        );
    }

    pub fn get_user_searches(&self, user_id: i64, limit: usize) -> Vec<SearchEntry> {
        self.logs
            .get(&user_id)
            .map(|logs| logs.iter().rev().take(limit).cloned().collect())
            .unwrap_or_default()
    }

    fn hash_query(query: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(query.as_bytes());
        hex::encode(hasher.finalize())[..16].to_string()
    }
}
