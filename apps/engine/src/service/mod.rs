pub mod audit;
mod index;
mod quota;
pub mod types;

use crate::error::Result;
use audit::AuditLog;
use index::SearchIndex;
use quota::QuotaTracker;
use std::collections::{HashMap, HashSet};
use types::{Contact, Lead, QuotaInfo, SearchResult, Stats};

pub struct LeadService {
    contacts: Vec<Contact>,
    index: SearchIndex,
    assignments: HashMap<i64, HashSet<usize>>,
    quota: QuotaTracker,
    audit: AuditLog,
}

impl LeadService {
    pub async fn new(data_path: &str, default_quota: u32) -> Result<Self> {
        let contacts = crate::data::load_csv(data_path).await?;
        let index = SearchIndex::build(&contacts);

        tracing::info!("service ready: {} contacts", contacts.len());

        Ok(Self {
            contacts,
            index,
            assignments: HashMap::new(),
            quota: QuotaTracker::new(default_quota),
            audit: AuditLog::new(),
        })
    }

    pub fn search_dni(&self, user_id: i64, dni: &str) -> Result<(Vec<SearchResult>, u32)> {
        let remaining = self
            .quota
            .check_and_consume(user_id)
            .map_err(|_| crate::error::Error::QuotaExceeded)?;

        let results = self
            .index
            .by_dni
            .get(dni)
            .map(|indices| self.results_at(indices))
            .unwrap_or_default();

        self.audit.log_search(user_id, "dni", dni, results.len());

        Ok((results, remaining))
    }

    pub fn search_ruc(&self, user_id: i64, ruc: &str) -> Result<(Vec<SearchResult>, u32)> {
        let remaining = self
            .quota
            .check_and_consume(user_id)
            .map_err(|_| crate::error::Error::QuotaExceeded)?;

        let results = self
            .index
            .by_ruc
            .get(ruc)
            .map(|indices| self.results_at(indices))
            .unwrap_or_default();

        self.audit.log_search(user_id, "ruc", ruc, results.len());

        Ok((results, remaining))
    }

    pub fn search_phone(&self, user_id: i64, phone: &str) -> Result<(Vec<SearchResult>, u32)> {
        let remaining = self
            .quota
            .check_and_consume(user_id)
            .map_err(|_| crate::error::Error::QuotaExceeded)?;

        let results = self
            .index
            .by_phone
            .get(phone)
            .map(|indices| self.results_at(indices))
            .unwrap_or_default();

        self.audit
            .log_search(user_id, "phone", phone, results.len());

        Ok((results, remaining))
    }

    pub fn search_name(
        &self,
        user_id: i64,
        name: &str,
        limit: usize,
    ) -> Result<(Vec<SearchResult>, u32)> {
        let remaining = self
            .quota
            .check_and_consume(user_id)
            .map_err(|_| crate::error::Error::QuotaExceeded)?;

        let name_lower = name.to_lowercase();
        let results: Vec<SearchResult> = self
            .contacts
            .iter()
            .filter(|c| c.name.to_lowercase().contains(&name_lower))
            .take(limit.min(50))
            .map(SearchResult::from)
            .collect();

        self.audit.log_search(user_id, "name", name, results.len());

        Ok((results, remaining))
    }

    pub fn get_my_leads(&self, user_id: i64) -> Vec<Lead> {
        self.assignments
            .get(&user_id)
            .map(|indices| {
                indices
                    .iter()
                    .copied()
                    .filter_map(|i| self.contacts.get(i))
                    .map(Lead::from)
                    .collect()
            })
            .unwrap_or_default()
    }

    pub fn get_unassigned(&self, limit: usize) -> Vec<Lead> {
        let assigned_ids: std::collections::HashSet<usize> = self
            .assignments
            .values()
            .flat_map(|v| v.iter())
            .copied()
            .collect();

        self.contacts
            .iter()
            .enumerate()
            .filter(|(i, _)| !assigned_ids.contains(i))
            .take(limit)
            .map(|(_, c)| Lead::from(c))
            .collect()
    }

    pub fn mark_assigned(&mut self, assigned_to: i64, assigned_by: i64, ids: Vec<usize>) -> usize {
        let mut count = 0;

        for id in ids {
            if id < self.contacts.len()
                && self
                    .assignments
                    .entry(assigned_to)
                    .or_default()
                    .insert(id)
            {
                self.audit.log_assignment(id, assigned_to, assigned_by);
                count += 1;
            }
        }

        count
    }

    pub fn get_quota(&self, user_id: i64) -> QuotaInfo {
        let (limit, used, remaining) = self.quota.get_quota(user_id);
        QuotaInfo {
            limit,
            used,
            remaining,
        }
    }

    pub fn set_quota(&self, user_id: i64, new_limit: u32) {
        self.quota.set_limit(user_id, new_limit);
    }

    pub fn get_audit(&self, user_id: i64, limit: usize) -> Vec<audit::SearchEntry> {
        self.audit.get_user_searches(user_id, limit)
    }

    pub fn stats(&self) -> Stats {
        let assigned_count: usize = self.assignments.values().map(|v| v.len()).sum();

        Stats {
            total_contacts: self.contacts.len(),
            assigned_contacts: assigned_count,
            available_contacts: self.contacts.len().saturating_sub(assigned_count),
            unique_organizations: self.index.by_ruc.len(),
            unique_phones: self.index.by_phone.len(),
            memory_mb: (self.contacts.len() * 200) as f64 / 1_048_576.0,
        }
    }

    fn results_at(&self, indices: &[usize]) -> Vec<SearchResult> {
        indices
            .iter()
            .filter_map(|&i| self.contacts.get(i))
            .map(SearchResult::from)
            .collect()
    }
}
