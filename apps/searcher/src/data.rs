//! CSV data loading with robust error handling
//! 
//! Handles the integrated phone data CSV format.
//! Validates data integrity during load to fail fast.

use crate::{errors::ApiError, types::PhoneRecord};
use std::fs::File;
use tracing::info;

pub struct DataLoader;

impl DataLoader {
    /// Load phone records from integrated CSV file
    /// 
    /// Uses csv crate for efficient parsing of large files.
    /// Validates each record to ensure data integrity.
    pub fn load_csv(path: &str) -> Result<Vec<PhoneRecord>, ApiError> {
        info!("Loading phone data from: {}", path);
        
        let file = File::open(path)
            .map_err(|e| ApiError::DataLoad(format!("Cannot open {}: {}", path, e)))?;
            
        let mut reader = csv::ReaderBuilder::new()
            .has_headers(true)
            .from_reader(file);
            
        let mut records = Vec::new();
        let mut line_num = 1; // Start at 1 for header
        
        for result in reader.records() {
            line_num += 1;
            
            let record = result
                .map_err(|e| ApiError::DataLoad(format!("CSV parse error at line {}: {}", line_num, e)))?;
                
            // Validate CSV structure (expecting: dni,ruc,phones,operators)
            if record.len() != 4 {
                return Err(ApiError::DataLoad(format!(
                    "Invalid CSV format at line {}: expected 4 fields, found {}", 
                    line_num, record.len()
                )));
            }
            
            let phone_record = Self::parse_record(&record, line_num)?;
            records.push(phone_record);
            
            // Log progress for large files
            if line_num % 1_000_000 == 0 {
                info!("Loaded {} million records...", line_num / 1_000_000);
            }
        }
        
        info!("Successfully loaded {} phone records", records.len());
        Ok(records)
    }
    
    /// Parse individual CSV record into PhoneRecord struct
    fn parse_record(record: &csv::StringRecord, line_num: usize) -> Result<PhoneRecord, ApiError> {
        let dni = record[0].trim().to_string();
        if dni.is_empty() {
            return Err(ApiError::DataLoad(format!("Empty DNI at line {}", line_num)));
        }
        
        let ruc = if record[1].trim().is_empty() {
            None
        } else {
            Some(record[1].trim().to_string())
        };
        
        let phones = if record[2].trim().is_empty() {
            vec![]
        } else {
            record[2].split(';').map(|s| s.trim().to_string()).collect()
        };
        
        let operators = if record[3].trim().is_empty() {
            vec![]
        } else {
            record[3].split(',').map(|s| s.trim().to_string()).collect()
        };
        
        Ok(PhoneRecord {
            dni,
            ruc,
            phones,
            operators,
        })
    }
}
