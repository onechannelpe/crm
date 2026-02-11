pub mod types;

use crate::error::Result;
use std::{collections::HashSet, sync::RwLock};
use types::{Contact, Lead, Stats};

pub struct LeadService {
    contacts: Vec<Contact>,
    assigned: RwLock<HashSet<usize>>,
}

impl LeadService {
    pub async fn new(data_path: &str) -> Result<Self> {
        let contacts = crate::data::load_csv(data_path).await?;
        let assigned = RwLock::new(HashSet::new());
        
        tracing::info!("service initialized with {} contacts", contacts.len());
        
        Ok(Self {
            contacts,
            assigned,
        })
    }
    
    pub fn get_unassigned(&self, limit: usize) -> Vec<Lead> {
        let assigned = self.assigned.read().unwrap();
        
        self.contacts
            .iter()
            .enumerate()
            .filter(|(i, _)| !assigned.contains(i))
            .take(limit)
            .map(|(_, c)| Lead::from(c))
            .collect()
    }
    
    pub fn mark_assigned(&self, ids: Vec<usize>) -> usize {
        let mut assigned = self.assigned.write().unwrap();
        let mut count = 0;
        
        for id in ids {
            if id < self.contacts.len() && assigned.insert(id) {
                count += 1;
            }
        }
        
        count
    }
    
    pub fn stats(&self) -> Stats {
        let assigned = self.assigned.read().unwrap();
        let total = self.contacts.len();
        let assigned_count = assigned.len();
        
        Stats {
            total_contacts: total,
            assigned_contacts: assigned_count,
            available_contacts: total - assigned_count,
            memory_mb: (total * 200) as f64 / 1_048_576.0,
        }
    }
}
