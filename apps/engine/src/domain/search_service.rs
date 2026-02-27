use crate::api::contracts::{SearchRequest, SearchResponse, SearchType};
use crate::errors::ApiError;
use crate::storage::sqlite::connection::SqlitePool;
use crate::storage::sqlite::queries;
use crate::validation::input;

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
            SearchType::Dni => input::validate_dni(&req.value)?,
            SearchType::Ruc => input::validate_ruc(&req.value)?,
            SearchType::Phone | SearchType::PhoneEnriched => {
                input::validate_phone(&req.value)?
            }
            SearchType::PersonName | SearchType::CompanyName => {
                input::validate_text(&req.value)?
            }
        }

        let limit = req.limit.min(self.max_limit).max(1);
        let conn = self
            .pool
            .get()
            .map_err(|e| ApiError::Service(format!("pool get failed: {e}")))?;

        let rows = match req.search_type {
            SearchType::Dni => queries::search_dni(&conn, &req.value, limit)?,
            SearchType::Ruc => queries::search_ruc(&conn, &req.value, limit)?,
            SearchType::Phone => queries::search_phone(&conn, &req.value, limit)?,
            SearchType::PersonName => queries::search_person_name(&conn, &req.value, limit)?,
            SearchType::CompanyName => queries::search_company_name(&conn, &req.value, limit)?,
            SearchType::PhoneEnriched => {
                queries::search_phone_enriched(&conn, &req.value, limit)?
            }
        };

        let count = rows.len();
        Ok(SearchResponse {
            results: rows,
            count,
        })
    }
}
