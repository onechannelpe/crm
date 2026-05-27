use crate::PipelineError;
use crate::schema::open_rw;
use rusqlite::OptionalExtension;

pub fn validate_snapshot(db_path: &str, snapshot_label: &str) -> Result<(), PipelineError> {
    let conn = open_rw(db_path)?;

    let row = conn
        .query_row(
            r#"
            SELECT
                ss.snapshot_id,
                ss.status,
                sm.total_rows,
                sm.accepted_rows,
                sm.invalid_doc_rows,
                sm.invalid_ruc_rows,
                sm.invalid_phone_rows
            FROM source_snapshot ss
            LEFT JOIN snapshot_metrics sm ON sm.snapshot_id = ss.snapshot_id
            WHERE ss.snapshot_label = ?1
            ORDER BY ss.snapshot_id DESC
            LIMIT 1
            "#,
            [snapshot_label],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<i64>>(2)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(3)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(4)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(5)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(6)?.unwrap_or(0),
                ))
            },
        )
        .optional()?;

    let Some((
        snapshot_id,
        status,
        total_rows,
        accepted_rows,
        invalid_doc,
        invalid_ruc,
        invalid_phone,
    )) = row
    else {
        return Err(PipelineError::Args(format!(
            "snapshot not found for label: {snapshot_label}"
        )));
    };

    println!(
        "{{\"snapshot_id\":{snapshot_id},\"status\":\"{status}\",\"total_rows\":{total_rows},\"accepted_rows\":{accepted_rows},\"invalid_doc_rows\":{invalid_doc},\"invalid_ruc_rows\":{invalid_ruc},\"invalid_phone_rows\":{invalid_phone}}}"
    );
    Ok(())
}
