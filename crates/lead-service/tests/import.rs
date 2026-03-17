use engine_infra::sqlite::SqlitePool;
use lead_service::contracts::{LeadImportRequest, LeadImportRow};
use lead_service::schema_guard;
use lead_service::service::ImportService;
use proptest::prelude::*;
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;

fn make_test_pool() -> SqlitePool {
    let manager = SqliteConnectionManager::memory();
    let pool = Pool::new(manager).expect("in-memory pool");
    let conn = pool.get().expect("conn");
    schema_guard::validate(&conn).expect("schema setup");
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
    // ruc is wrong length (not 11 digits) so the row is always invalid
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
        rows in prop::collection::vec(arb_valid_row(), 1..20)
    ) {
        // Dedupe by ruc+dni so the batch itself has no internal duplicates.
        let mut seen = std::collections::HashSet::new();
        let rows: Vec<_> = rows.into_iter().filter(|r| seen.insert((r.ruc.clone(), r.dni.clone()))).collect();
        let n = rows.len();

        let svc = ImportService::new(make_test_pool());

        let req = LeadImportRequest { rows: rows.clone(), source: "test".into() };
        let r1 = svc.import_leads(&req).expect("first import");
        prop_assert_eq!(r1.inserted, n, "first call should insert all");
        prop_assert_eq!(r1.updated, 0);
        prop_assert_eq!(r1.skipped, 0);

        let req2 = LeadImportRequest { rows, source: "test".into() };
        let r2 = svc.import_leads(&req2).expect("second import");
        prop_assert_eq!(r2.inserted, 0, "second call should insert nothing");
        prop_assert_eq!(r2.updated, n, "second call should update all");
        prop_assert_eq!(r2.skipped, 0);
    }

    #[test]
    fn invalid_rows_are_skipped_not_rejected(
        valid in prop::collection::vec(arb_valid_row(), 0..10),
        invalid in prop::collection::vec(arb_invalid_row(), 1..10),
    ) {
        // Dedupe valid rows by ruc+dni.
        let mut seen = std::collections::HashSet::new();
        let valid: Vec<_> = valid.into_iter().filter(|r| seen.insert((r.ruc.clone(), r.dni.clone()))).collect();
        let valid_count = valid.len();
        let invalid_count = invalid.len();

        let mut rows = valid;
        rows.extend(invalid);
        let total = rows.len();

        let svc = ImportService::new(make_test_pool());
        let req = LeadImportRequest { rows, source: "test".into() };
        let result = svc.import_leads(&req).expect("import should not fail");

        prop_assert_eq!(result.total, total);
        prop_assert_eq!(result.skipped, invalid_count);
        prop_assert_eq!(result.inserted + result.updated, valid_count);
    }
}
