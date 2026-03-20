// GENERATED FILE. DO NOT EDIT.
// Source: contracts/engine/search-projection.json
// Generator: tools/codegen/bin/generate.ts
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct PersonInfo {
    pub dni: String,
    pub name: Option<String>,
    pub ruc: Option<String>,
    pub birth_date: Option<String>,
    pub birth_place: Option<String>,
    pub sex: Option<String>,
    pub marital_status: Option<String>,
    pub location_text: Option<String>,
    pub ubigeo_code: Option<String>,
    pub mother_name: Option<String>,
    pub father_name: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct OrgInfo {
    pub ruc: Option<String>,
    pub name: Option<String>,
    pub trade_name: Option<String>,
    pub company_type: Option<String>,
    pub status: Option<String>,
    pub condition: Option<String>,
    pub fiscal_address: Option<String>,
    pub registration_date: Option<String>,
    pub activity_start_date: Option<String>,
    pub line_of_business: Option<String>,
    pub economic_activity: Option<String>,
    pub ubigeo_code: Option<String>,
    pub department: Option<String>,
    pub province: Option<String>,
    pub district: Option<String>,
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
