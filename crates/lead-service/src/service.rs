use crate::contracts::{
    LeadCandidateRequest, LeadCandidatesResponse, LeadImportRequest, LeadImportResponse,
};
use crate::domain;
use crate::repos;
use engine_infra::error::ApiError;
use engine_infra::sqlite::SqlitePool;

#[derive(Clone)]
pub struct CandidateService {
    pool: SqlitePool,
    max_limit: usize,
}

impl CandidateService {
    pub fn new(pool: SqlitePool, max_limit: usize) -> Self {
        Self { pool, max_limit }
    }

    pub fn candidates(&self, req: &LeadCandidateRequest) -> Result<LeadCandidatesResponse, ApiError> {
        if req.branch_id <= 0 {
            return Err(ApiError::Validation("branch_id must be positive".into()));
        }
        if req.user_id <= 0 {
            return Err(ApiError::Validation("user_id must be positive".into()));
        }
        if req.team_id.is_some_and(|id| id <= 0) {
            return Err(ApiError::Validation("team_id must be positive".into()));
        }
        if req.product_id.is_some_and(|id| id <= 0) {
            return Err(ApiError::Validation("product_id must be positive".into()));
        }

        let limit = req.amount.min(self.max_limit).max(1);
        let conn = self
            .pool
            .get()
            .map_err(|e| ApiError::Service(format!("pool get failed: {e}")))?;

        let candidates =
            repos::list_lead_candidates(&conn, limit, req.branch_id, req.user_id, req.strategy)?;
        let ranked = domain::rank_candidates(candidates, req.strategy);
        let deduped = domain::dedupe_candidates(ranked);
        let count = deduped.len();
        Ok(LeadCandidatesResponse { candidates: deduped, count })
    }
}

#[derive(Clone)]
pub struct ImportService {
    pool: SqlitePool,
}

impl ImportService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub fn import_leads(&self, req: &LeadImportRequest) -> Result<LeadImportResponse, ApiError> {
        let total = req.rows.len();
        let valid: Vec<_> = req
            .rows
            .iter()
            .filter(|r| is_valid_import_row(r))
            .collect();
        let skipped = total - valid.len();

        let conn = self
            .pool
            .get()
            .map_err(|e| ApiError::Service(format!("pool get failed: {e}")))?;

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|_| ApiError::Internal)?
            .as_secs() as i64;

        let owned: Vec<_> = valid.into_iter().cloned().collect();
        let (inserted, updated) = repos::upsert_batch(&conn, &owned, &req.source, now)?;

        Ok(LeadImportResponse { inserted, updated, skipped, total })
    }
}

fn is_valid_import_row(row: &crate::contracts::LeadImportRow) -> bool {
    let ruc_ok = row.ruc.len() == 11 && row.ruc.chars().all(|c| c.is_ascii_digit());
    let dni_ok = row.dni.len() >= 8
        && row.dni.len() <= 12
        && row.dni.chars().all(|c| c.is_ascii_digit());
    let phone_ok = !row.phone_primary.trim().is_empty();
    let name_ok = !row.person_name.trim().is_empty();
    ruc_ok && dni_ok && phone_ok && name_ok
}
