use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct Record {
    pub dni: Arc<str>,
    pub name: Option<Arc<str>>,
    pub phone_primary: Option<Arc<str>>,
    pub phone_secondary: Option<Arc<str>>,
    pub org_ruc: Option<Arc<str>>,
    pub org_name: Option<Arc<str>>,
}

#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub dni: Arc<str>,
    pub name: Arc<str>,
    pub phone_primary: Option<Arc<str>>,
    pub phone_secondary: Option<Arc<str>>,
    pub org_ruc: Option<Arc<str>>,
    pub org_name: Option<Arc<str>>,
}

impl From<&Record> for SearchResult {
    fn from(r: &Record) -> Self {
        Self {
            dni: r.dni.clone(),
            name: r
                .name
                .clone()
                .unwrap_or_else(|| Arc::<str>::from(format!("Contacto {}", r.dni))),
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
