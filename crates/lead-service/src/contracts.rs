use serde::Deserialize;

pub use crate::contracts_generated::{
    LeadCandidate, LeadCandidatesResponse, LeadImportRequest, LeadImportResponse, LeadImportRow,
};

fn default_amount() -> usize {
    20
}

#[derive(Debug, Deserialize)]
pub struct LeadCandidateRequest {
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
