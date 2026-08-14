use crate::PipelineError;
use crate::ingest::IngestCounters;
use crate::storage::db::open_rw;
use serde::Serialize;

/// Share of rows whose document column could not be parsed, above which a
/// snapshot is rejected. Matches the threshold `run_gate` applies to the
/// offline build.
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

/// Judges one freshly staged snapshot from its shard counters alone.
///
/// This runs *before* the merge, which is the only point where rejecting a bad
/// file is free: `merge_core.sql` upserts `document_attribute.full_name` and
/// `company.legal_name` in place, so once a snapshot is merged there is no
/// general way to restore the values it overwrote.
///
/// Deliberately not `run_gate`: that one re-judges every source's latest
/// snapshot in the database, so a historical source that is already below
/// threshold would veto every future ingest.
pub fn gate_staged_snapshot(source_key: &str, counters: &IngestCounters) -> GateResult {
    let accepted = counters.accepted_rows;
    let total = counters.total_rows;
    let mut checks = vec![GateCheck {
        name: format!("{source_key}.accepted_rows_gt_0"),
        passed: accepted > 0,
        actual: accepted as f64,
        threshold: 1.0,
        // Zero accepted rows on a non-empty file usually means the mapping's
        // column names did not resolve, which happens when a source file is
        // missing the header row the mapping assumes.
        message: format!("source {source_key}: accepted_rows={accepted} of total_rows={total}"),
    }];

    if total > 0 {
        let invalid_doc = counters.invalid_doc_rows;
        let ratio = invalid_doc as f64 / total as f64;
        checks.push(GateCheck {
            name: format!("{source_key}.invalid_doc_ratio"),
            passed: ratio < MAX_INVALID_DOC_RATIO,
            actual: ratio,
            threshold: MAX_INVALID_DOC_RATIO,
            message: format!(
                "source {source_key}: invalid_doc={invalid_doc}/{total} ({:.1}%)",
                ratio * 100.0
            ),
        });
    }

    let passed = checks.iter().all(|check| check.passed);
    GateResult { passed, checks }
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
            SELECT sr.source_key, sm.accepted_rows, sm.invalid_doc_rows, sm.total_rows
            FROM latest_snapshot ls
            JOIN source_registry sr ON sr.source_id = ls.source_id
            LEFT JOIN snapshot_metrics sm ON sm.snapshot_id = ls.snapshot_id
            "#,
        )?;
        stmt.query_map([], |row| {
            Ok(SourceSnapshotMetrics {
                source_key: row.get::<_, String>(0)?,
                accepted_rows: row.get::<_, Option<i64>>(1)?,
                invalid_doc_rows: row.get::<_, Option<i64>>(2)?,
                total_rows: row.get::<_, Option<i64>>(3)?,
            })
        })?
        .collect::<Result<_, _>>()?
    };

    for snapshot in snapshots {
        if snapshot.accepted_rows.is_none()
            || snapshot.invalid_doc_rows.is_none()
            || snapshot.total_rows.is_none()
        {
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
            continue;
        }
        let accepted = snapshot.accepted_rows.unwrap_or_default();
        let invalid_doc = snapshot.invalid_doc_rows.unwrap_or_default();
        let total = snapshot.total_rows.unwrap_or_default();

        checks.push(GateCheck {
            name: format!("{}.accepted_rows_gt_0", snapshot.source_key),
            passed: accepted > 0,
            actual: accepted as f64,
            threshold: 1.0,
            message: format!("source {}: accepted_rows={accepted}", snapshot.source_key),
        });

        if total > 0 {
            let ratio = invalid_doc as f64 / total as f64;
            checks.push(GateCheck {
                name: format!("{}.invalid_doc_ratio", snapshot.source_key),
                passed: ratio < MAX_INVALID_DOC_RATIO,
                actual: ratio,
                threshold: MAX_INVALID_DOC_RATIO,
                message: format!(
                    "source {}: invalid_doc={invalid_doc}/{total} ({:.1}%)",
                    snapshot.source_key,
                    ratio * 100.0
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

    let all_passed = checks.iter().all(|c| c.passed);
    Ok(GateResult {
        passed: all_passed,
        checks,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn counters(total: i64, accepted: i64, invalid_doc: i64) -> IngestCounters {
        IngestCounters {
            total_rows: total,
            accepted_rows: accepted,
            invalid_doc_rows: invalid_doc,
            ..IngestCounters::default()
        }
    }

    #[test]
    fn accepts_a_snapshot_with_rows_and_few_unparseable_documents() {
        let result = gate_staged_snapshot("osiptel_scan_sunat", &counters(1_000, 990, 10));
        assert!(result.passed);
    }

    // A mapping whose column names do not resolve produces rows that normalize
    // to nothing, which is what a missing header row looks like from here.
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

    // The whole-db run_gate judges every source's latest snapshot, so one
    // historical source below threshold vetoes every future ingest. The staged
    // gate must look only at the snapshot in hand.
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
    fn an_empty_file_is_rejected_without_a_ratio_check() {
        let result = gate_staged_snapshot("osiptel_scan_sunat", &counters(0, 0, 0));
        assert!(!result.passed);
        assert_eq!(result.checks.len(), 1, "no ratio check without rows");
    }
}
