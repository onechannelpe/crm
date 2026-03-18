use crate::contracts::{SearchRequest, SearchResponse, SearchType};
use crate::domain;
use crate::repo::{SearchRepository, SqliteSearchRepository};
use shared::error::ApiError;
use shared::sqlite::SqlitePool;
use std::sync::Arc;

#[derive(Clone)]
pub struct SearchService {
    repo: Arc<dyn SearchRepository>,
    pool: SqlitePool,
    max_limit: usize,
}

impl SearchService {
    pub fn new(pool: SqlitePool, max_limit: usize) -> Self {
        Self {
            repo: Arc::new(SqliteSearchRepository),
            pool,
            max_limit,
        }
    }

    pub fn with_repo(
        pool: SqlitePool,
        max_limit: usize,
        repo: Arc<dyn SearchRepository>,
    ) -> Self {
        Self {
            repo,
            pool,
            max_limit,
        }
    }

    #[tracing::instrument(skip(self, req), fields(search_type = ?req.search_type, limit = req.limit))]
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
            SearchType::Dni => self.repo.search_by_dni(&conn, &req.value, limit)?,
            SearchType::Ruc => self.repo.search_by_ruc(&conn, &req.value, limit)?,
            SearchType::Phone => self.repo.search_by_phone(&conn, &req.value, limit)?,
            SearchType::PhoneEnriched => {
                self.repo.search_by_phone_enriched(&conn, &req.value, limit)?
            }
            SearchType::PersonName => self.repo.search_by_person_name(&conn, &req.value, limit)?,
            SearchType::CompanyName => self.repo.search_by_company_name(&conn, &req.value, limit)?,
        };

        let count = rows.len();
        Ok(SearchResponse {
            results: rows,
            count,
        })
    }
}
