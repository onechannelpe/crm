use crate::PipelineError;
use crate::storage::db::open_rw;
use serde::Serialize;

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
            let threshold = 0.05;
            checks.push(GateCheck {
                name: format!("{}.invalid_doc_ratio", snapshot.source_key),
                passed: ratio < threshold,
                actual: ratio,
                threshold,
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
