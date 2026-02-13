use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct Record {
    pub dni: String,
    pub name: String,
    pub phone_primary: Option<String>,
    pub phone_secondary: Option<String>,
    pub org_ruc: Option<String>,
    pub org_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub dni: String,
    pub name: String,
    pub phone_primary: Option<String>,
    pub phone_secondary: Option<String>,
    pub org_ruc: Option<String>,
    pub org_name: Option<String>,
}

impl From<&Record> for SearchResult {
    fn from(r: &Record) -> Self {
        Self {
            dni: r.dni.clone(),
            name: r.name.clone(),
            phone_primary: r.phone_primary.clone(),
            phone_secondary: r.phone_secondary.clone(),
            org_ruc: r.org_ruc.clone(),
            org_name: r.org_name.clone(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct SearchRequest {
    #[serde(rename = "type")]
    pub search_type: SearchType,
    pub value: String,
    #[serde(default = "default_limit")]
    pub limit: usize,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SearchType {
    Dni,
    Ruc,
    Phone,
    Name,
}

fn default_limit() -> usize {
    20
}

#[derive(Debug, Serialize)]
pub struct SearchResponse {
    pub results: Vec<SearchResult>,
    pub count: usize,
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub records: usize,
}
