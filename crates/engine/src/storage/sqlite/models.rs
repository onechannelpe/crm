pub use crate::storage::sqlite::result_contract_generated::{
    OrgInfo, PersonInfo, PhoneInfo, RoleInfo, SearchRow,
};

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
