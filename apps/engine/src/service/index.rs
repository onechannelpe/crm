use super::types::Contact;
use std::collections::HashMap;

pub struct SearchIndex {
    pub by_dni: HashMap<String, Vec<usize>>,
    pub by_ruc: HashMap<String, Vec<usize>>,
    pub by_phone: HashMap<String, Vec<usize>>,
}

impl SearchIndex {
    pub fn build(contacts: &[Contact]) -> Self {
        let mut by_dni: HashMap<String, Vec<usize>> = HashMap::new();
        let mut by_ruc: HashMap<String, Vec<usize>> = HashMap::new();
        let mut by_phone: HashMap<String, Vec<usize>> = HashMap::new();

        for (i, contact) in contacts.iter().enumerate() {
            by_dni.entry(contact.dni.clone()).or_default().push(i);

            if let Some(ref ruc) = contact.org_ruc {
                by_ruc.entry(ruc.clone()).or_default().push(i);
            }

            if let Some(ref phone) = contact.phone_primary {
                by_phone.entry(phone.clone()).or_default().push(i);
            }

            if let Some(ref phone) = contact.phone_secondary {
                by_phone.entry(phone.clone()).or_default().push(i);
            }
        }

        tracing::info!(
            "indexes: {} dni, {} ruc, {} phones",
            by_dni.len(),
            by_ruc.len(),
            by_phone.len()
        );

        Self {
            by_dni,
            by_ruc,
            by_phone,
        }
    }
}
