use crate::types::Record;
use std::collections::HashMap;

pub struct SearchIndex {
    pub records: Vec<Record>,
    pub by_dni: HashMap<String, Vec<usize>>,
    pub by_ruc: HashMap<String, Vec<usize>>,
    pub by_phone: HashMap<String, Vec<usize>>,
}

impl SearchIndex {
    pub fn build(records: &[Record]) -> Self {
        let mut by_dni: HashMap<String, Vec<usize>> = HashMap::new();
        let mut by_ruc: HashMap<String, Vec<usize>> = HashMap::new();
        let mut by_phone: HashMap<String, Vec<usize>> = HashMap::new();

        for (i, record) in records.iter().enumerate() {
            by_dni.entry(record.dni.clone()).or_default().push(i);

            if let Some(ref ruc) = record.org_ruc {
                by_ruc.entry(ruc.clone()).or_default().push(i);
            }

            if let Some(ref phone) = record.phone_primary {
                by_phone.entry(phone.clone()).or_default().push(i);
            }

            if let Some(ref phone) = record.phone_secondary {
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
            records: records.to_vec(),
            by_dni,
            by_ruc,
            by_phone,
        }
    }

    pub fn record_count(&self) -> usize {
        self.records.len()
    }
}
