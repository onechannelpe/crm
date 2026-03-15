use crate::api::contracts::{LeadCandidateRequest, LeadCandidateResponse};
use crate::errors::ApiError;
use crate::storage::sqlite::connection::SqlitePool;
use crate::storage::sqlite::queries;

#[derive(Clone)]
pub struct CandidateService {
    pool: SqlitePool,
    max_limit: usize,
}

impl CandidateService {
    pub fn new(pool: SqlitePool, max_limit: usize) -> Self {
        Self { pool, max_limit }
    }

    pub fn candidates(
        &self,
        req: &LeadCandidateRequest,
    ) -> Result<LeadCandidateResponse, ApiError> {
        if req.branch_id <= 0 {
            return Err(ApiError::Validation("branch_id must be positive".into()));
        }
        if req.user_id <= 0 {
            return Err(ApiError::Validation("user_id must be positive".into()));
        }

        let limit = req.amount.min(self.max_limit).max(1);
        let conn = self
            .pool
            .get()
            .map_err(|e| ApiError::Service(format!("pool get failed: {e}")))?;
        let candidates = queries::list_lead_candidates(&conn, limit)?;
        let count = candidates.len();
        Ok(LeadCandidateResponse { candidates, count })
    }
}
