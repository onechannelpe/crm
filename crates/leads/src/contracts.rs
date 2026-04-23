use serde::Deserialize;

// Generated struct types are re-exported here so callers only import from
// `leads::contracts`, never from the generated module directly.
pub use crate::contracts_generated::{
    RecordCandidate, RecordCandidatesResponse, RecordImportRequest, RecordImportResponse,
    RecordImportRow,
};

#[derive(Debug, Deserialize)]
pub struct RecordCandidateRequest {
    pub branch_id: i64,
    pub user_id: i64,
    #[serde(default = "default_amount")]
    pub amount: usize,
    pub team_id: Option<i64>,
    pub product_id: Option<i64>,
    #[serde(default)]
    pub strategy: CandidateStrategy,
}

#[derive(Debug, Deserialize, Clone, Copy, Default)]
#[serde(rename_all = "snake_case")]
pub enum CandidateStrategy {
    #[default]
    Balanced,
    Freshness,
    Conversion,
}

fn default_amount() -> usize {
    20
}
