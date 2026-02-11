use crate::{errors::ApiError, types::ContactRecord};
use std::fs::File;
use tracing::info;

pub struct DataLoader;

impl DataLoader {
    pub fn load_csv(path: &str) -> Result<Vec<ContactRecord>, ApiError> {
        info!("Loading contact data from: {}", path);
        
        let file = File::open(path)
            .map_err(|e| ApiError::DataLoad(format!("Cannot open {}: {}", path, e)))?;
        
        let mut reader = csv::ReaderBuilder::new()
            .has_headers(true)
            .from_reader(file);
        
        let mut records = Vec::new();
        
        for (idx, result) in reader.records().enumerate() {
            let record = result
                .map_err(|e| ApiError::DataLoad(format!("CSV parse error: {}", e)))?;
            
            if record.len() < 3 {
                continue;
            }
            
            let contact = ContactRecord {
                id: idx,
                dni: record.get(0).unwrap_or("").trim().to_string(),
                name: record.get(1).unwrap_or("").trim().to_string(),
                phone_primary: Self::parse_optional(&record, 2),
                phone_secondary: Self::parse_optional(&record, 3),
                org_ruc: Self::parse_optional(&record, 4),
                org_name: Self::parse_optional(&record, 5),
            };
            
            if !contact.dni.is_empty() && !contact.name.is_empty() {
                records.push(contact);
            }
        }
        
        info!("Loaded {} contact records", records.len());
        Ok(records)
    }
    
    fn parse_optional(record: &csv::StringRecord, index: usize) -> Option<String> {
        record.get(index)
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
    }
}
