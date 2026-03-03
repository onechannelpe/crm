use crate::PipelineError;
use crate::stages::merge::sql::{
    MERGE_CLEANUP_SQL, MERGE_CORE_SQL, MERGE_PHONE_SQL, MERGE_PREPARE_SQL,
};
use rusqlite::params;
use std::path::Path;
use std::time::Instant;

#[derive(Default, Clone, Copy)]
pub(super) struct MergeShardTimings {
    pub prepare_secs: f64,
    pub core_secs: f64,
    pub phone_secs: f64,
    pub cleanup_secs: f64,
    pub attach_detach_secs: f64,
}

pub(super) fn merge_one_shard(
    main_conn: &mut rusqlite::Connection,
    shard_db_path: &Path,
    snapshot_id: i64,
) -> Result<MergeShardTimings, PipelineError> {
    let source_id: i64 = main_conn.query_row(
        "SELECT source_id FROM source_snapshot WHERE snapshot_id = ?1",
        [snapshot_id],
        |row| row.get(0),
    )?;
    let tx = main_conn.transaction()?;
    let shard_path = shard_db_path.to_string_lossy().to_string();
    let mut timings = MergeShardTimings::default();

    let attach_started_at = Instant::now();
    tx.execute("ATTACH DATABASE ?1 AS shard", params![shard_path])?;
    timings.attach_detach_secs += attach_started_at.elapsed().as_secs_f64();

    let prepare_started_at = Instant::now();
    tx.execute_batch(MERGE_PREPARE_SQL)?;
    tx.execute(
        r#"
        CREATE TEMP TABLE tmp_row_delta AS
        SELECT ts.source_row_number, ts.raw_hash
        FROM tmp_stage ts
        LEFT JOIN source_row_hash_latest latest
            ON latest.source_id = ?1
           AND latest.source_row_number = ts.source_row_number
        WHERE latest.raw_hash IS NULL OR latest.raw_hash <> ts.raw_hash
        "#,
        [source_id],
    )?;
    tx.execute(
        "CREATE INDEX tmp_row_delta_source_row_idx ON tmp_row_delta(source_row_number)",
        [],
    )?;
    timings.prepare_secs = prepare_started_at.elapsed().as_secs_f64();

    let core_started_at = Instant::now();
    tx.execute_batch(MERGE_CORE_SQL)?;
    timings.core_secs = core_started_at.elapsed().as_secs_f64();

    let merge_phone_sql = MERGE_PHONE_SQL.replace("{snapshot_id}", &snapshot_id.to_string());
    let phone_started_at = Instant::now();
    tx.execute_batch(&merge_phone_sql)?;
    timings.phone_secs = phone_started_at.elapsed().as_secs_f64();

    // Mark dirty persons and update row hash tracking.
    // entity_evidence table was removed — was write-only, ~25% of pipeline time with no readers.
    let dirty_started_at = Instant::now();
    tx.execute_batch(
        r#"
        INSERT OR IGNORE INTO projection_dirty_person(person_id)
        SELECT DISTINCT pp.person_id
        FROM tmp_stage ts
        JOIN tmp_row_delta delta ON delta.source_row_number = ts.source_row_number
        JOIN person_profile pp ON pp.dni = ts.person_dni
        WHERE ts.person_dni IS NOT NULL;

        INSERT OR IGNORE INTO projection_dirty_person(person_id)
        SELECT DISTINCT pp.person_id
        FROM tmp_stage ts
        JOIN tmp_row_delta delta ON delta.source_row_number = ts.source_row_number
        JOIN person_profile pp ON pp.natural_ruc10 = ts.person_natural_ruc
        WHERE ts.person_natural_ruc IS NOT NULL;

        INSERT OR IGNORE INTO projection_dirty_person(person_id)
        SELECT DISTINCT pcr.person_id
        FROM tmp_stage ts
        JOIN tmp_row_delta delta ON delta.source_row_number = ts.source_row_number
        JOIN company_profile cp ON cp.ruc = ts.company_ruc
        JOIN person_company_role pcr ON pcr.company_id = cp.company_id
        WHERE ts.company_ruc IS NOT NULL
            AND pcr.person_id IS NOT NULL;

        INSERT OR IGNORE INTO projection_dirty_person(person_id)
        SELECT DISTINCT pcr.person_id
        FROM tmp_stage ts
        JOIN tmp_row_delta delta ON delta.source_row_number = ts.source_row_number
        JOIN company_profile cp ON cp.ruc = ts.company_ruc
        JOIN person_company_role pcr
            ON pcr.company_id = cp.company_id
           AND pcr.rep_doc_type = ts.rep_doc_type
           AND pcr.rep_doc_number = ts.rep_doc_number
           AND pcr.role_name = ts.role_name
           AND pcr.role_start_date = ts.role_start_date
        WHERE ts.company_ruc IS NOT NULL
            AND pcr.person_id IS NOT NULL;
        "#,
    )?;
    tx.execute(
        r#"
        INSERT INTO source_row_hash_latest(
            source_id,
            source_row_number,
            raw_hash,
            updated_snapshot_id
        )
        SELECT
            ?1,
            ts.source_row_number,
            ts.raw_hash,
            ?2
        FROM tmp_stage ts
        JOIN tmp_row_delta delta ON delta.source_row_number = ts.source_row_number
        ON CONFLICT(source_id, source_row_number) DO UPDATE SET
            raw_hash = excluded.raw_hash,
            updated_snapshot_id = excluded.updated_snapshot_id
        "#,
        params![source_id, snapshot_id],
    )?;
    timings.core_secs += dirty_started_at.elapsed().as_secs_f64();

    let cleanup_started_at = Instant::now();
    tx.execute_batch(MERGE_CLEANUP_SQL)?;
    timings.cleanup_secs = cleanup_started_at.elapsed().as_secs_f64();
    tx.commit()?;
    let detach_started_at = Instant::now();
    main_conn.execute("DETACH DATABASE shard", [])?;
    timings.attach_detach_secs += detach_started_at.elapsed().as_secs_f64();

    Ok(timings)
}
