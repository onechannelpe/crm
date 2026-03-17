use crate::api::contracts::{LeadCandidateRequest, LeadCandidateResponse};
use crate::errors::ApiError;
use crate::ranking::candidate_ranker::{dedupe_candidates, rank_candidates};
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
        if req.team_id.is_some_and(|team_id| team_id <= 0) {
            return Err(ApiError::Validation("team_id must be positive".into()));
        }
        if req.product_id.is_some_and(|product_id| product_id <= 0) {
            return Err(ApiError::Validation("product_id must be positive".into()));
        }

        let limit = req.amount.min(self.max_limit).max(1);
        let context_branch = req
            .branch_id
            .saturating_add(req.team_id.unwrap_or(0).saturating_mul(17));
        let context_user = req
            .user_id
            .saturating_add(req.product_id.unwrap_or(0).saturating_mul(31));
        let conn = self
            .pool
            .get()
            .map_err(|e| ApiError::Service(format!("pool get failed: {e}")))?;
        let candidates = queries::list_lead_candidates(
            &conn,
            limit,
            context_branch,
            context_user,
            req.strategy,
        )?;
        let ranked = rank_candidates(candidates, req.strategy);
        let deduped = dedupe_candidates(ranked);
        let count = deduped.len();
        Ok(LeadCandidateResponse {
            candidates: deduped,
            count,
        })
    }
}
