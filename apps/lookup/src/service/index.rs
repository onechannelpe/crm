use super::types::Contact;
use std::collections::HashMap;

pub struct Index {
    by_ruc: HashMap<String, Vec<usize>>,
    by_phone: HashMap<String, Vec<usize>>,
}

impl Index {
    pub fn build(contacts: &[Contact]) -> Self {
        let by_ruc = Self::build_ruc_index(contacts);
        let by_phone = Self::build_phone_index(contacts);
        
        tracing::info!(
            "indexes built: {} ruc, {} phones",
            by_ruc.len(),
            by_phone.len()
        );
        
        Self { by_ruc, by_phone }
    }
    
    fn build_ruc_index(contacts: &[Contact]) -> HashMap<String, Vec<usize>> {
        let mut index = HashMap::new();
        
        for (i, contact) in contacts.iter().enumerate() {
            if let Some(ref ruc) = contact.org_ruc {
                index.entry(ruc.clone()).or_insert_with(Vec::new).push(i);
            }
        }
        
        index
    }
    
    fn build_phone_index(contacts: &[Contact]) -> HashMap<String, Vec<usize>> {
        let mut index = HashMap::new();
        
        for (i, contact) in contacts.iter().enumerate() {
            if let Some(ref phone) = contact.phone_primary {
                index.entry(phone.clone()).or_insert_with(Vec::new).push(i);
            }
            if let Some(ref phone) = contact.phone_secondary {
                index.entry(phone.clone()).or_insert_with(Vec::new).push(i);
            }
        }
        
        index
    }
}
