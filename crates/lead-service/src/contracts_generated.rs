// GENERATED FILE. DO NOT EDIT.
// This file will be replaced by `bun run generate:lead-contract` in task 7.
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Clone)]
pub struct LeadCandidate {
    pub ruc: String,
    pub organization_name: String,
    pub dni: String,
    pub person_name: String,
    pub phone_primary: String,
}

#[derive(Debug, Serialize)]
pub struct LeadCandidatesResponse {
    pub candidates: Vec<LeadCandidate>,
    pub count: usize,
}

#[derive(Debug, Deserialize, Clone)]
pub struct LeadImportRow {
    pub ruc: String,
    pub organization_name: String,
    pub dni: String,
    pub person_name: String,
    pub phone_primary: String,
    pub quality_tier: Option<i32>,
    pub product_tag: Option<String>,
    pub branch_tag: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct LeadImportRequest {
    pub rows: Vec<LeadImportRow>,
    pub source: String,
}

#[derive(Debug, Serialize)]
pub struct LeadImportResponse {
    pub inserted: usize,
    pub updated: usize,
    pub skipped: usize,
    pub total: usize,
}
