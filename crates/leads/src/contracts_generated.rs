// GENERATED FILE. DO NOT EDIT.
// Source: contracts/engine/record-api.json
// Generator: tools/codegen/bin/generate.ts
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Clone)]
pub struct RecordCandidate {
    pub ruc: String,
    pub organization_name: String,
    pub dni: String,
    pub person_name: String,
    pub phone_primary: String,
}

#[derive(Debug, Serialize)]
pub struct RecordCandidatesResponse {
    pub candidates: Vec<RecordCandidate>,
    pub count: usize,
}

#[derive(Debug, Deserialize, Clone)]
pub struct RecordImportRow {
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
pub struct RecordImportRequest {
    pub rows: Vec<RecordImportRow>,
    pub source: String,
}

#[derive(Debug, Serialize)]
pub struct RecordImportResponse {
    pub inserted: usize,
    pub updated: usize,
    pub skipped: usize,
    pub total: usize,
}
