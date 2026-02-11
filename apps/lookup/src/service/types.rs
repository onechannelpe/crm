use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct Contact {
    pub id: usize,
    pub dni: String,
    pub name: String,
    pub phone_primary: Option<String>,
    pub phone_secondary: Option<String>,
    pub org_ruc: Option<String>,
    pub org_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Lead {
    pub id: usize,
    pub dni: String,
    pub name: String,
    pub phone_primary: Option<String>,
    pub phone_secondary: Option<String>,
    pub org_ruc: Option<String>,
    pub org_name: Option<String>,
}

impl From<&Contact> for Lead {
    fn from(c: &Contact) -> Self {
        Self {
            id: c.id,
            dni: c.dni.clone(),
            name: c.name.clone(),
            phone_primary: c.phone_primary.clone(),
            phone_secondary: c.phone_secondary.clone(),
            org_ruc: c.org_ruc.clone(),
            org_name: c.org_name.clone(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct AssignRequest {
    pub lead_ids: Vec<usize>,
}

#[derive(Debug, Serialize)]
pub struct Stats {
    pub total_contacts: usize,
    pub assigned_contacts: usize,
    pub available_contacts: usize,
    pub memory_mb: f64,
}
