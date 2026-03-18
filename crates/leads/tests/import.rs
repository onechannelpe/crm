use leads::contracts::{LeadImportRequest, LeadImportRow};
use leads::service::ImportService;
use proptest::prelude::*;
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use shared::sqlite::SqlitePool;
use std::collections::HashSet;
use std::thread;
use tempfile::NamedTempFile;

fn make_test_pool() -> SqlitePool {
    let pool = Pool::new(SqliteConnectionManager::memory()).expect("pool");
    let conn = pool.get().expect("conn");
    leads::validate_schema(&conn).expect("schema");
    drop(conn);
    pool
}

fn arb_valid_row() -> impl Strategy<Value = LeadImportRow> {
    (
        "[0-9]{11}",
        "[0-9]{8,12}",
        "[a-z]{1,20}",
        "[a-z]{1,20}",
        "[0-9]{7,9}",
    )
        .prop_map(|(ruc, dni, org, person, phone)| LeadImportRow {
            ruc,
            organization_name: org,
            dni,
            person_name: person,
            phone_primary: phone,
            quality_tier: None,
            product_tag: None,
            branch_tag: None,
        })
}

fn arb_invalid_row() -> impl Strategy<Value = LeadImportRow> {
    // RUC shorter than 11 digits — always fails validation.
    "[0-9]{1,10}".prop_map(|ruc| LeadImportRow {
        ruc,
        organization_name: "org".into(),
        dni: "12345678".into(),
        person_name: "person".into(),
        phone_primary: "9999999".into(),
        quality_tier: None,
        product_tag: None,
        branch_tag: None,
    })
}

proptest! {
    #[test]
    fn upsert_is_idempotent(
        rows in prop::collection::vec(arb_valid_row(), 1..20),
    ) {
        // Remove intra-batch duplicates by ruc+dni.
        let mut seen = HashSet::new();
        let rows: Vec<_> = rows
            .into_iter()
            .filter(|r| seen.insert((r.ruc.clone(), r.dni.clone())))
            .collect();
        let n = rows.len();

        let svc = ImportService::new(make_test_pool());

        let r1 = svc.import_leads(&LeadImportRequest { rows: rows.clone(), source: "test".into() })
            .expect("first import");
        prop_assert_eq!(r1.inserted, n, "first call should insert all");
        prop_assert_eq!(r1.updated,  0);
        prop_assert_eq!(r1.skipped,  0);

        let r2 = svc.import_leads(&LeadImportRequest { rows, source: "test".into() })
            .expect("second import");
        prop_assert_eq!(r2.inserted, 0, "second call should insert nothing");
        prop_assert_eq!(r2.updated,  n, "second call should update all");
        prop_assert_eq!(r2.skipped,  0);
    }

    #[test]
    fn invalid_rows_are_skipped_not_rejected(
        valid   in prop::collection::vec(arb_valid_row(),   0..10),
        invalid in prop::collection::vec(arb_invalid_row(), 1..10),
    ) {
        let mut seen = HashSet::new();
        let valid: Vec<_> = valid
            .into_iter()
            .filter(|r| seen.insert((r.ruc.clone(), r.dni.clone())))
            .collect();
        let valid_count   = valid.len();
        let invalid_count = invalid.len();

        let mut rows = valid;
        rows.extend(invalid);
        let total = rows.len();

        let svc    = ImportService::new(make_test_pool());
        let result = svc.import_leads(&LeadImportRequest { rows, source: "test".into() })
            .expect("import should not fail");

        prop_assert_eq!(result.total,   total);
        prop_assert_eq!(result.skipped, invalid_count);
        prop_assert_eq!(result.inserted + result.updated, valid_count);
    }
}

fn fixed_valid_row() -> LeadImportRow {
    LeadImportRow {
        ruc: "20100000001".into(),
        organization_name: "Org".into(),
        dni: "12345678".into(),
        person_name: "Alice".into(),
        phone_primary: "999111222".into(),
        quality_tier: Some(2),
        product_tag: Some("internet".into()),
        branch_tag: Some(1),
    }
}

#[test]
fn concurrent_identical_imports_are_idempotent() {
    let db = NamedTempFile::new().expect("temp file");
    let manager = SqliteConnectionManager::file(db.path());
    let pool = Pool::builder()
        .max_size(4)
        .build(manager)
        .expect("pool");
    let conn = pool.get().expect("conn");
    leads::validate_schema(&conn).expect("schema");

    let service_a = ImportService::new(pool.clone());
    let service_b = ImportService::new(pool.clone());
    let t1 = thread::spawn(move || {
        service_a.import_leads(&LeadImportRequest {
            rows: vec![fixed_valid_row()],
            source: "concurrency".into(),
        })
    });

    let t2 = thread::spawn(move || {
        service_b.import_leads(&LeadImportRequest {
            rows: vec![fixed_valid_row()],
            source: "concurrency".into(),
        })
    });

    let r1 = t1.join().expect("thread 1 panicked").expect("thread 1 result");
    let r2 = t2.join().expect("thread 2 panicked").expect("thread 2 result");

    assert_eq!(r1.inserted + r2.inserted, 1);
    assert_eq!(r1.updated + r2.updated, 1);
    assert_eq!(r1.skipped + r2.skipped, 0);
    assert_eq!(r1.total + r2.total, 2);
}
