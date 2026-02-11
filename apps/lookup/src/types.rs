use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct ContactRecord {
    pub id: usize,
    pub dni: String,
    pub name: String,
    pub phone_primary: Option<String>,
    pub phone_secondary: Option<String>,
    pub org_ruc: Option<String>,
    pub org_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LeadSearchResult {
    pub id: usize,
    pub dni: String,
    pub name: String,
    pub phone_primary: Option<String>,
    pub phone_secondary: Option<String>,
    pub org_ruc: Option<String>,
    pub org_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LeadResponse {
    pub leads: Vec<LeadSearchResult>,
    pub count: usize,
}

#[derive(Debug, Deserialize)]
pub struct AssignRequest {
    pub lead_ids: Vec<usize>,
    pub user_id: i64,
    pub branch_id: i64,
}

#[derive(Debug, Serialize)]
pub struct ServiceStats {
    pub total_contacts: usize,
    pub assigned_contacts: usize,
    pub available_contacts: usize,
    pub memory_mb: f64,
}

pub type ContactIndex = HashMap<String, Vec<usize>>;
