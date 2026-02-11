//! Core lookup service with business logic
//! 
//! Handles phone number lookups with optimized performance.
//! Encapsulates lookup logic separate from HTTP concerns.

use crate::{
    data::DataLoader,
    errors::ApiResult,
    index::IndexBuilder,
    types::{LookupIndex, LookupResponse, LookupResult, PhoneRecord, ServiceStats},
};
use std::time::Instant;
use tracing::info;

/// Phone lookup service with pre-built indexes
pub struct PhoneLookupService {
    records: Vec<PhoneRecord>,
    dni_index: LookupIndex,
    ruc_index: LookupIndex, 
    phone_index: LookupIndex,
    pub stats: ServiceStats,
}

impl PhoneLookupService {
    /// Initialize service by loading data and building indexes
    /// 
    /// This is expensive (~43 seconds) but only done once at startup.
    /// Pre-computing indexes trades startup time for query speed.
    pub async fn new(data_path: &str) -> ApiResult<Self> {
        let start_time = Instant::now();
        
        // Load CSV data (I/O bound)
        let records = DataLoader::load_csv(data_path)?;
        
        info!("Building optimized lookup indexes...");
        
        // Build indexes (CPU bound)
        let dni_index = IndexBuilder::build_dni_index(&records);
        let ruc_index = IndexBuilder::build_ruc_index(&records);
        let phone_index = IndexBuilder::build_phone_index(&records);
        
        let startup_time = start_time.elapsed().as_secs_f64();
        let memory_mb = IndexBuilder::estimate_memory_mb(&dni_index, &ruc_index, &phone_index, &records);
        
        let stats = ServiceStats {
            total_records: records.len(),
            unique_dnis: dni_index.len(),
            unique_rucs: ruc_index.len(),
            unique_phones: phone_index.len(),
            memory_mb,
            startup_time_seconds: startup_time,
        };
        
        info!("Service ready! {} records, {:.1}MB memory, {:.1}s startup", 
              stats.total_records, stats.memory_mb, stats.startup_time_seconds);
        
        Ok(Self {
            records,
            dni_index,
            ruc_index,
            phone_index,
            stats,
        })
    }
    
    /// Lookup by DNI (most common operation)
    pub fn lookup_by_dni(&self, dni: &str) -> LookupResponse {
        self.lookup_with_index(dni, &self.dni_index, "dni")
    }
    
    /// Lookup by RUC (business queries)
    pub fn lookup_by_ruc(&self, ruc: &str) -> LookupResponse {
        self.lookup_with_index(ruc, &self.ruc_index, "ruc")
    }
    
    /// Lookup by phone (reverse lookup)
    pub fn lookup_by_phone(&self, phone: &str) -> LookupResponse {
        self.lookup_with_index(phone, &self.phone_index, "phone")
    }
    
    /// Generic lookup using any index (DRY principle)
    fn lookup_with_index(&self, query: &str, index: &LookupIndex, query_type: &str) -> LookupResponse {
        match index.get(query) {
            Some(indices) => {
                let results: Vec<LookupResult> = indices.iter()
                    .map(|&i| {
                        let record = &self.records[i];
                        LookupResult {
                            dni: record.dni.clone(),
                            ruc: record.ruc.clone(),
                            phones: record.phones.clone(),
                            operators: record.operators.clone(),
                        }
                    })
                    .collect();
                    
                LookupResponse {
                    query: query.to_string(),
                    query_type: query_type.to_string(),
                    found: true,
                    results: results.clone(),
                    count: results.len(),
                }
            }
            None => LookupResponse {
                query: query.to_string(),
                query_type: query_type.to_string(),
                found: false,
                results: vec![],
                count: 0,
            }
        }
    }
}
