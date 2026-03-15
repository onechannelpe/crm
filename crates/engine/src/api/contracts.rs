use crate::storage::sqlite::models::SearchRow;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct SearchRequest {
    #[serde(rename = "type")]
    pub search_type: SearchType,
    pub value: String,
    #[serde(default = "default_limit")]
    pub limit: usize,
}

#[derive(Debug, Deserialize, Clone, Copy)]
#[serde(rename_all = "snake_case")]
pub enum SearchType {
    Dni,
    Ruc,
    Phone,
    PersonName,
    CompanyName,
    PhoneEnriched,
}

fn default_limit() -> usize {
    20
}

#[derive(Debug, Serialize)]
pub struct SearchResponse {
    pub results: Vec<SearchRow>,
    pub count: usize,
}

#[derive(Debug, Deserialize)]
pub struct LeadCandidateRequest {
    pub branch_id: i64,
    pub user_id: i64,
    #[serde(default = "default_limit")]
    pub amount: usize,
}

#[derive(Debug, Serialize)]
pub struct LeadCandidate {
    pub ruc: String,
    pub organization_name: String,
    pub dni: String,
    pub person_name: String,
    pub phone_primary: String,
}

#[derive(Debug, Serialize)]
pub struct LeadCandidateResponse {
    pub candidates: Vec<LeadCandidate>,
    pub count: usize,
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub build_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub built_at: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rows: Option<i64>,
}
