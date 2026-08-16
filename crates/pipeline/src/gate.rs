use crate::PipelineError;
use crate::ingest::IngestCounters;
use crate::storage::db::open_rw;
use serde::Serialize;

const MAX_INVALID_DOC_RATIO: f64 = 0.05;

#[derive(Debug, Serialize)]
pub struct GateCheck {
    pub name: String,
    pub passed: bool,
    pub actual: f64,
    pub threshold: f64,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct GateResult {
    pub passed: bool,
    pub checks: Vec<GateCheck>,
}

struct SourceSnapshotMetrics {
    source_key: String,
    accepted_rows: Option<i64>,
    invalid_doc_rows: Option<i64>,
    total_rows: Option<i64>,
}

/// Checks only the staged snapshot, so old bad snapshots cannot block new ingests.
pub fn gate_staged_snapshot(source_key: &str, counters: &IngestCounters) -> GateResult {
    let checks = row_count_checks(
        source_key,
        counters.accepted_rows,
        counters.invalid_doc_rows,
        counters.total_rows,
    );

    let passed = checks.iter().all(|check| check.passed);

    GateResult { passed, checks }
}

fn row_count_checks(
    source_key: &str,
    accepted_rows: i64,
    invalid_doc_rows: i64,
    total_rows: i64,
) -> Vec<GateCheck> {
    let mut checks = vec![GateCheck {
        name: format!("{source_key}.accepted_rows_gt_0"),
        passed: accepted_rows > 0,
        actual: accepted_rows as f64,
        threshold: 1.0,
        message: format!(
            "source {source_key}: accepted_rows={accepted_rows} of total_rows={total_rows}"
        ),
    }];

    if total_rows > 0 {
        let ratio = invalid_doc_rows as f64 / total_rows as f64;

        checks.push(GateCheck {
            name: format!("{source_key}.invalid_doc_ratio"),
            passed: ratio < MAX_INVALID_DOC_RATIO,
            actual: ratio,
            threshold: MAX_INVALID_DOC_RATIO,
            message: format!(
                "source {source_key}: invalid_doc={invalid_doc_rows}/{total_rows} ({:.1}%)",
                ratio * 100.0
            ),
        });
    }

    checks
}

pub fn run_gate(db_path: &str) -> Result<GateResult, PipelineError> {
    let conn = open_rw(db_path)?;
    let mut checks = Vec::new();

    let snapshots: Vec<SourceSnapshotMetrics> = {
        let mut stmt = conn.prepare(
            r#"
            WITH latest_snapshot AS (
                SELECT source_id, MAX(snapshot_id) AS snapshot_id
                FROM source_snapshot
                GROUP BY source_id
            )
            SELECT
                sr.source_key,
                sm.accepted_rows,
                sm.invalid_doc_rows,
                sm.total_rows
            FROM latest_snapshot ls
            JOIN source_registry sr ON sr.source_id = ls.source_id
            LEFT JOIN snapshot_metrics sm ON sm.snapshot_id = ls.snapshot_id
            "#,
        )?;

        stmt.query_map([], |row| {
            Ok(SourceSnapshotMetrics {
                source_key: row.get(0)?,
                accepted_rows: row.get(1)?,
                invalid_doc_rows: row.get(2)?,
                total_rows: row.get(3)?,
            })
        })?
        .collect::<Result<_, _>>()?
    };

    for snapshot in snapshots {
        if let (Some(accepted_rows), Some(invalid_doc_rows), Some(total_rows)) = (
            snapshot.accepted_rows,
            snapshot.invalid_doc_rows,
            snapshot.total_rows,
        ) {
            checks.extend(row_count_checks(
                &snapshot.source_key,
                accepted_rows,
                invalid_doc_rows,
                total_rows,
            ));
        } else {
            checks.push(GateCheck {
                name: format!("{}.snapshot_metrics_present", snapshot.source_key),
                passed: false,
                actual: 0.0,
                threshold: 1.0,
                message: format!(
                    "source {}: latest snapshot is missing snapshot_metrics row",
                    snapshot.source_key
                ),
            });
        }
    }

    let doc_projection_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM doc_projection", [], |row| row.get(0))?;

    checks.push(GateCheck {
        name: "doc_projection.row_count_gt_0".into(),
        passed: doc_projection_count > 0,
        actual: doc_projection_count as f64,
        threshold: 1.0,
        message: format!("doc_projection has {doc_projection_count} rows"),
    });

    let company_projection_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM company_projection", [], |row| {
            row.get(0)
        })?;

    checks.push(GateCheck {
        name: "company_projection.row_count_gt_0".into(),
        passed: company_projection_count > 0,
        actual: company_projection_count as f64,
        threshold: 1.0,
        message: format!("company_projection has {company_projection_count} rows"),
    });

    let doc_phone_index_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM doc_projection_phone_index",
        [],
        |row| row.get(0),
    )?;

    checks.push(GateCheck {
        name: "doc_projection_phone_index.row_count_gt_0".into(),
        passed: doc_phone_index_count > 0,
        actual: doc_phone_index_count as f64,
        threshold: 1.0,
        message: format!("doc_projection_phone_index has {doc_phone_index_count} rows"),
    });

    let company_phone_index_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM company_projection_phone_index",
        [],
        |row| row.get(0),
    )?;

    checks.push(GateCheck {
        name: "company_projection_phone_index.row_count_gt_0".into(),
        passed: company_phone_index_count > 0,
        actual: company_phone_index_count as f64,
        threshold: 1.0,
        message: format!("company_projection_phone_index has {company_phone_index_count} rows"),
    });

    let passed = checks.iter().all(|check| check.passed);

    Ok(GateResult { passed, checks })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn counters(total_rows: i64, accepted_rows: i64, invalid_doc_rows: i64) -> IngestCounters {
        IngestCounters {
            total_rows,
            accepted_rows,
            invalid_doc_rows,
            ..IngestCounters::default()
        }
    }

    #[test]
    fn accepts_a_snapshot_with_rows_and_few_unparseable_documents() {
        let result = gate_staged_snapshot("osiptel_scan_sunat", &counters(1_000, 990, 10));

        assert!(result.passed);
    }

    #[test]
    fn rejects_a_snapshot_where_no_row_was_accepted() {
        let result = gate_staged_snapshot("osiptel_scan_sunat", &counters(1_000, 0, 0));

        assert!(!result.passed);
        assert!(
            result
                .checks
                .iter()
                .any(|check| check.name.ends_with("accepted_rows_gt_0") && !check.passed)
        );
    }

    #[test]
    fn rejects_a_snapshot_over_the_invalid_document_threshold() {
        let result = gate_staged_snapshot("osiptel_scan_sunat", &counters(1_000, 900, 100));

        assert!(!result.passed);
    }

    #[test]
    fn judges_only_the_snapshot_it_was_given() {
        let result = gate_staged_snapshot("osiptel_scan_sunat", &counters(1_000, 1_000, 0));

        assert!(result.passed);
        assert!(
            result
                .checks
                .iter()
                .all(|check| check.name.starts_with("osiptel_scan_sunat."))
        );
    }

    #[test]
    fn rejects_an_empty_file_without_a_ratio_check() {
        let result = gate_staged_snapshot("osiptel_scan_sunat", &counters(0, 0, 0));

        assert!(!result.passed);
        assert_eq!(result.checks.len(), 1, "no ratio check without rows");
    }
}
