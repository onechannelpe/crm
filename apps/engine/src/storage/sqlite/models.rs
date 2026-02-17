use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct SearchRow {
    pub dni: String,
    pub name: String,
    pub org_ruc: Option<String>,
    pub org_name: Option<String>,
    pub phone_primary: Option<String>,
    pub phone_secondary: Option<String>,
    pub sibling_phones: Option<Vec<String>>,
}

impl SearchRow {
    pub fn with_siblings(mut self, phones_csv: Option<String>) -> Self {
        self.sibling_phones = phones_csv.map(|raw| {
            raw.split([';', ','])
                .filter(|p| !p.trim().is_empty())
                .map(|p| p.trim().to_string())
                .collect()
        });
        self
    }
}
