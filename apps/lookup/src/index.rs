use crate::types::{ContactIndex, ContactRecord};
use std::collections::{HashMap, HashSet};
use tracing::info;

pub struct IndexBuilder;

impl IndexBuilder {
    pub fn build_ruc_index(records: &[ContactRecord]) -> ContactIndex {
        info!("Building RUC index...");
        let mut index = HashMap::new();
        
        for (i, record) in records.iter().enumerate() {
            if let Some(ref ruc) = record.org_ruc {
                index.entry(ruc.clone())
                    .or_insert_with(Vec::new)
                    .push(i);
            }
        }
        
        info!("RUC index built: {} unique organizations", index.len());
        index
    }
    
    pub fn build_phone_index(records: &[ContactRecord]) -> ContactIndex {
        info!("Building phone index...");
        let mut index = HashMap::new();
        
        for (i, record) in records.iter().enumerate() {
            if let Some(ref phone) = record.phone_primary {
                index.entry(phone.clone())
                    .or_insert_with(Vec::new)
                    .push(i);
            }
            if let Some(ref phone) = record.phone_secondary {
                index.entry(phone.clone())
                    .or_insert_with(Vec::new)
                    .push(i);
            }
        }
        
        info!("Phone index built: {} unique phones", index.len());
        index
    }
    
    pub fn build_assigned_set(records: &[ContactRecord]) -> HashSet<usize> {
        HashSet::with_capacity(records.len() / 10)
    }
}
