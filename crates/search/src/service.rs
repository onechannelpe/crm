use crate::contracts::{SearchRequest, SearchResponse, SearchType};
use crate::domain;
use crate::repo;
use shared::error::ApiError;
use shared::sqlite::SqlitePool;

#[derive(Clone)]
pub struct SearchService {
    pool: SqlitePool,
    max_limit: usize,
}

impl SearchService {
    pub fn new(pool: SqlitePool, max_limit: usize) -> Self {
        Self { pool, max_limit }
    }

    pub fn search(&self, req: &SearchRequest) -> Result<SearchResponse, ApiError> {
        match req.search_type {
            SearchType::Dni => domain::validate_dni(&req.value)?,
            SearchType::Ruc => domain::validate_ruc(&req.value)?,
            SearchType::Phone | SearchType::PhoneEnriched => domain::validate_phone(&req.value)?,
            SearchType::PersonName | SearchType::CompanyName => domain::validate_text(&req.value)?,
        }

        let limit = req.limit.min(self.max_limit).max(1);
        let conn = self
            .pool
            .get()
            .map_err(|e| ApiError::Service(format!("pool get failed: {e}")))?;

        let rows = match req.search_type {
            SearchType::Dni => repo::search_by_dni(&conn, &req.value, limit)?,
            SearchType::Ruc => repo::search_by_ruc(&conn, &req.value, limit)?,
            SearchType::Phone => repo::search_by_phone(&conn, &req.value, limit)?,
            SearchType::PhoneEnriched => repo::search_by_phone_enriched(&conn, &req.value, limit)?,
            SearchType::PersonName => repo::search_by_person_name(&conn, &req.value, limit)?,
            SearchType::CompanyName => repo::search_by_company_name(&conn, &req.value, limit)?,
        };

        let count = rows.len();
        Ok(SearchResponse {
            results: rows,
            count,
        })
    }
}
