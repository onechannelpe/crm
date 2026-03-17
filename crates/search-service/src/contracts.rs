use serde::{Deserialize, Serialize};

pub use crate::result_contract_generated::SearchRow;

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
    PhoneEnriched,
    PersonName,
    CompanyName,
}

fn default_limit() -> usize {
    20
}

#[derive(Debug, Serialize)]
pub struct SearchResponse {
    pub results: Vec<SearchRow>,
    pub count: usize,
}
