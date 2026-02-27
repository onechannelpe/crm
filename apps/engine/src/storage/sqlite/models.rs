use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct PersonInfo {
    pub dni: String,
    pub name: String,
    pub birth_date: Option<String>,
    pub birth_place: Option<String>,
    pub sex: Option<String>,
    pub marital_status: Option<String>,
    pub location_text: Option<String>,
    pub ubigeo_code: Option<String>,
    pub mother_name: Option<String>,
    pub father_name: Option<String>,
    pub email: Option<String>,
    pub ruc: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct OrgInfo {
    pub ruc: String,
    pub name: String,
    pub trade_name: Option<String>,
    pub company_type: Option<String>,
    pub status: Option<String>,
    pub condition: Option<String>,
    pub fiscal_address: Option<String>,
    pub registration_date: Option<String>,
    pub activity_start_date: Option<String>,
    pub line_of_business: Option<String>,
    pub economic_activity: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RoleInfo {
    pub name: String,
    pub start_date: Option<String>,
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

impl SearchRow {
    pub fn with_siblings(mut self, phones_csv: Option<String>) -> Self {
        self.phones.siblings = phones_csv.map(|raw| {
            raw.split([';', ','])
                .filter(|p| !p.trim().is_empty())
                .map(|p| p.trim().to_string())
                .collect()
        });
        self
    }
}
