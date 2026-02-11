use crate::{
    data::DataLoader,
    errors::ApiResult,
    index::IndexBuilder,
    types::{ContactIndex, ContactRecord, LeadResponse, LeadSearchResult, ServiceStats},
};
use std::collections::HashSet;
use std::sync::RwLock;
use tracing::info;

pub struct SearcherService {
    records: Vec<ContactRecord>,
    ruc_index: ContactIndex,
    phone_index: ContactIndex,
    assigned: RwLock<HashSet<usize>>,
}

impl SearcherService {
    pub async fn new(data_path: &str) -> ApiResult<Self> {
        let records = DataLoader::load_csv(data_path)?;
        
        let ruc_index = IndexBuilder::build_ruc_index(&records);
        let phone_index = IndexBuilder::build_phone_index(&records);
        let assigned = RwLock::new(IndexBuilder::build_assigned_set(&records));
        
        info!("Searcher service ready with {} records", records.len());
        
        Ok(Self {
            records,
            ruc_index,
            phone_index,
            assigned,
        })
    }
    
    pub fn get_unassigned(&self, limit: usize) -> LeadResponse {
        let assigned = self.assigned.read().unwrap();
        
        let leads: Vec<LeadSearchResult> = self.records
            .iter()
            .enumerate()
            .filter(|(i, _)| !assigned.contains(i))
            .take(limit)
            .map(|(_, record)| LeadSearchResult {
                id: record.id,
                dni: record.dni.clone(),
                name: record.name.clone(),
                phone_primary: record.phone_primary.clone(),
                phone_secondary: record.phone_secondary.clone(),
                org_ruc: record.org_ruc.clone(),
                org_name: record.org_name.clone(),
            })
            .collect();
        
        let count = leads.len();
        LeadResponse { leads, count }
    }
    
    pub fn mark_assigned(&self, lead_ids: Vec<usize>) -> usize {
        let mut assigned = self.assigned.write().unwrap();
        let mut count = 0;
        
        for id in lead_ids {
            if id < self.records.len() && assigned.insert(id) {
                count += 1;
            }
        }
        
        count
    }
    
    pub fn stats(&self) -> ServiceStats {
        let assigned = self.assigned.read().unwrap();
        
        ServiceStats {
            total_contacts: self.records.len(),
            assigned_contacts: assigned.len(),
            available_contacts: self.records.len() - assigned.len(),
            memory_mb: (self.records.len() * 200) as f64 / 1_048_576.0,
        }
    }
}
