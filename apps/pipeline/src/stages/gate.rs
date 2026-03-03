use crate::PipelineError;
use crate::db::schema::open_rw;
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

pub fn run_gate(db_path: &str) -> Result<GateResult, PipelineError> {
    let conn = open_rw(db_path)?;
    let mut checks = Vec::new();

    // Per-source: invalid_dni_ratio < 5% and accepted_rows > 0.
    let snapshots: Vec<(String, i64, i64, i64)> = {
        let mut stmt = conn.prepare(
            r#"
            SELECT sr.source_key, sm.accepted_rows, sm.invalid_dni_rows, sm.total_rows
            FROM snapshot_metrics sm
            JOIN source_snapshot ss ON ss.snapshot_id = sm.snapshot_id
            JOIN source_registry sr ON sr.source_id = ss.source_id
            WHERE ss.status IN ('validated', 'merged')
            "#,
        )?;
        stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, i64>(3)?,
            ))
        })?
        .collect::<Result<_, _>>()?
    };

    for (source_key, accepted, invalid_dni, total) in snapshots {
        let accepted_check = GateCheck {
            name: format!("{source_key}.accepted_rows_gt_0"),
            passed: accepted > 0,
            actual: accepted as f64,
            threshold: 1.0,
            message: format!("source {source_key}: accepted_rows={accepted}"),
        };
        checks.push(accepted_check);

        if total > 0 {
            let ratio = invalid_dni as f64 / total as f64;
            let threshold = 0.05;
            checks.push(GateCheck {
                name: format!("{source_key}.invalid_dni_ratio"),
                passed: ratio < threshold,
                actual: ratio,
                threshold,
                message: format!(
                    "source {source_key}: invalid_dni={invalid_dni}/{total} ({:.1}%)",
                    ratio * 100.0
                ),
            });
        }
    }

    // Global: search_projection must be non-empty.
    let projection_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM search_projection", [], |row| {
            row.get(0)
        })?;
    checks.push(GateCheck {
        name: "search_projection.row_count_gt_0".into(),
        passed: projection_count > 0,
        actual: projection_count as f64,
        threshold: 1.0,
        message: format!("search_projection has {projection_count} rows"),
    });

    let phone_index_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM search_projection_phone_index",
        [],
        |row| row.get(0),
    )?;
    checks.push(GateCheck {
        name: "search_projection_phone_index.row_count_gt_0".into(),
        passed: phone_index_count > 0,
        actual: phone_index_count as f64,
        threshold: 1.0,
        message: format!("search_projection_phone_index has {phone_index_count} rows"),
    });

    let all_passed = checks.iter().all(|c| c.passed);
    Ok(GateResult {
        passed: all_passed,
        checks,
    })
}
