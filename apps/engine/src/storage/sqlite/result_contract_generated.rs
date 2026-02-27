// GENERATED FILE. DO NOT EDIT.
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct PersonInfo {
    pub dni: String,
    pub name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct OrgInfo {
    pub ruc: Option<String>,
    pub name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RoleInfo {
    pub name: Option<String>,
    pub start_date: Option<String>,
    pub rep_doc_type: Option<String>,
    pub rep_doc_number: Option<String>,
    pub rep_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PhoneInfo {
    pub primary: Option<String>,
    pub secondary: Option<String>,
    pub siblings: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct SearchRow {
    pub person: PersonInfo,
    pub org: Option<OrgInfo>,
    pub role: Option<RoleInfo>,
    pub phones: PhoneInfo,
}
