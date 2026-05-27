mod common;

use search::contracts::{SearchIntent, SearchRequest, SearchResult};
use search::query::sqlite::SearchRepository;
use search::service::SearchService;
use shared::error::ApiError;

use rusqlite::Connection;
use std::sync::Arc;

struct FailingSearchRepo;

impl SearchRepository for FailingSearchRepo {
    fn search_by_document(
        &self,
        _conn: &Connection,
        _doc_type: &str,
        _doc_number: &str,
        _limit: usize,
    ) -> Result<Vec<SearchResult>, ApiError> {
        Err(ApiError::Service("fake repo failure".into()))
    }

    fn search_by_ruc(
        &self,
        _conn: &Connection,
        _value: &str,
        _limit: usize,
    ) -> Result<Vec<SearchResult>, ApiError> {
        Err(ApiError::Service("fake repo failure".into()))
    }

    fn search_by_phone(
        &self,
        _conn: &Connection,
        _value: &str,
        _limit: usize,
    ) -> Result<Vec<SearchResult>, ApiError> {
        Err(ApiError::Service("fake repo failure".into()))
    }

    fn search_by_phone_enriched(
        &self,
        _conn: &Connection,
        _value: &str,
        _limit: usize,
    ) -> Result<Vec<SearchResult>, ApiError> {
        Err(ApiError::Service("fake repo failure".into()))
    }

    fn search_by_person_name(
        &self,
        _conn: &Connection,
        _value: &str,
        _limit: usize,
    ) -> Result<Vec<SearchResult>, ApiError> {
        Err(ApiError::Service("fake repo failure".into()))
    }

    fn search_by_company_name(
        &self,
        _conn: &Connection,
        _value: &str,
        _limit: usize,
    ) -> Result<Vec<SearchResult>, ApiError> {
        Err(ApiError::Service("fake repo failure".into()))
    }
}

fn make_test_pool() -> shared::sqlite::SqlitePool {
    let db = common::create_test_db();
    let pool = common::test_pool(&db);
    std::mem::forget(db);
    pool
}

#[test]
fn search_service_supports_repo_injection_for_failure_paths() {
    let service = SearchService::with_repo(make_test_pool(), 100, Arc::new(FailingSearchRepo));
    let req = SearchRequest {
        intent: SearchIntent::People,
        query: "12345678".into(),
        limit: 10,
    };

    let err = service.search(&req).expect_err("expected repo failure");
    match err {
        ApiError::Service(message) => assert!(message.contains("fake repo failure")),
        other => panic!("unexpected error type: {other}"),
    }
}
