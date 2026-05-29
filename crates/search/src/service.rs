use crate::contracts::{SearchRequest, SearchResponse};
use crate::domain;
use crate::query::sqlite;
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

    #[tracing::instrument(skip(self, req), fields(intent = ?req.intent, limit = req.limit))]
    pub fn search(&self, req: &SearchRequest) -> Result<SearchResponse, ApiError> {
        let strategy = domain::plan_query(req.intent, &req.query)?;
        let limit = req.limit.min(self.max_limit).max(1);
        let conn = self
            .pool
            .get()
            .map_err(|e| ApiError::Service(format!("pool get failed: {e}")))?;

        let results = sqlite::search(&conn, strategy, limit)?;

        Ok(SearchResponse {
            count: results.len(),
            results,
        })
    }
}
