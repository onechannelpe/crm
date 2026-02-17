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
        let limit = req.limit.min(self.max_limit).max(1);
        let conn = self
            .pool
            .get()
            .map_err(|e| ApiError::Service(format!("pool get failed: {e}")))?;

        let rows = match req.search_type {
            SearchType::Dni => {
                input::validate_dni(&req.value)?;
                queries::search_dni(&conn, &req.value, limit)?
            }
            SearchType::Ruc => {
                input::validate_ruc(&req.value)?;
                queries::search_ruc(&conn, &req.value, limit)?
            }
            SearchType::Phone => {
                input::validate_phone(&req.value)?;
                queries::search_phone(&conn, &req.value, limit)?
            }
            SearchType::PersonName => {
                input::validate_text(&req.value)?;
                queries::search_person_name(&conn, &req.value, limit)?
            }
            SearchType::CompanyName => {
                input::validate_text(&req.value)?;
                queries::search_company_name(&conn, &req.value, limit)?
            }
            SearchType::PhoneEnriched => {
                input::validate_phone(&req.value)?;
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
