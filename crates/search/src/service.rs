use crate::contracts::{SearchRequest, SearchResponse};
use crate::domain::{self, QueryStrategy};
use crate::query::sqlite::{SearchRepository, SqliteSearchRepository};
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

    pub fn with_repo(pool: SqlitePool, max_limit: usize, repo: Arc<dyn SearchRepository>) -> Self {
        Self {
            repo,
            pool,
            max_limit,
        }
    }

    #[tracing::instrument(skip(self, req), fields(intent = ?req.intent, limit = req.limit))]
    pub fn search(&self, req: &SearchRequest) -> Result<SearchResponse, ApiError> {
        let strategy = domain::plan_query(req.intent, &req.query)?;
        let limit = req.limit.min(self.max_limit).max(1);
        let conn = self
            .pool
            .get()
            .map_err(|e| ApiError::Service(format!("pool get failed: {e}")))?;

        let rows = match strategy {
            QueryStrategy::Document {
                doc_type,
                doc_number,
            } => self
                .repo
                .search_by_document(&conn, &doc_type, &doc_number, limit)?,
            QueryStrategy::Ruc(value) => self.repo.search_by_ruc(&conn, &value, limit)?,
            QueryStrategy::Phone(value) => self.repo.search_by_phone(&conn, &value, limit)?,
            QueryStrategy::PersonName(value) => {
                self.repo.search_by_person_name(&conn, &value, limit)?
            }
            QueryStrategy::CompanyName(value) => {
                self.repo.search_by_company_name(&conn, &value, limit)?
            }
            QueryStrategy::MixedName(value) => {
                let mut people = self.repo.search_by_person_name(&conn, &value, limit)?;
                let companies = self.repo.search_by_company_name(&conn, &value, limit)?;
                people.extend(companies);
                people
            }
        };

        Ok(SearchResponse {
            count: rows.len(),
            results: rows,
        })
    }
}
