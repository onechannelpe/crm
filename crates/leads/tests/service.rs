use leads::contracts::{LeadImportRequest, LeadImportRow};
use leads::repo::LeadsRepository;
use leads::service::ImportService;
use shared::error::ApiError;

use rusqlite::Connection;
use std::sync::Arc;

struct FailingLeadsRepo;

impl LeadsRepository for FailingLeadsRepo {
    fn list_candidates(
        &self,
        _conn: &Connection,
        _limit: usize,
        _branch_id: i64,
        _user_id: i64,
        _strategy: leads::contracts::CandidateStrategy,
    ) -> Result<Vec<leads::contracts::LeadCandidate>, ApiError> {
        Ok(Vec::new())
    }

    fn upsert_batch(
        &self,
        _conn: &mut Connection,
        _rows: &[LeadImportRow],
        _source: &str,
        _now: i64,
    ) -> Result<(usize, usize), ApiError> {
        Err(ApiError::Service("fake upsert failure".into()))
    }
}

fn make_test_pool() -> shared::sqlite::SqlitePool {
    r2d2::Pool::new(r2d2_sqlite::SqliteConnectionManager::memory()).expect("pool")
}

#[test]
fn import_service_supports_repo_injection_for_failure_paths() {
    let service = ImportService::with_repo(make_test_pool(), Arc::new(FailingLeadsRepo));
    let req = LeadImportRequest {
        rows: vec![LeadImportRow {
            ruc: "20100000001".into(),
            organization_name: "Org".into(),
            dni: "12345678".into(),
            person_name: "Alice".into(),
            phone_primary: "999111222".into(),
            quality_tier: Some(1),
            product_tag: None,
            branch_tag: None,
        }],
        source: "test".into(),
    };

    let err = service
        .import_leads(&req)
        .expect_err("expected repo failure");
    match err {
        ApiError::Service(message) => assert!(message.contains("fake upsert failure")),
        other => panic!("unexpected error type: {other}"),
    }
}
