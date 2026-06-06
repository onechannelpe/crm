use crate::PipelineError;
use crate::merge::stats::MergePhaseStats;
use rusqlite::params;
use std::path::Path;
use std::time::Instant;

const MERGE_PREPARE_SQL: &str = include_str!("sql/merge_prepare.sql");
const MERGE_CORE_SQL: &str = include_str!("sql/merge_core.sql");
const MERGE_PHONE_SQL: &str = include_str!("sql/merge_phone.sql");
const MERGE_EMAIL_SQL: &str = include_str!("sql/merge_email.sql");
const MERGE_CLEANUP_SQL: &str = include_str!("sql/merge_cleanup.sql");

pub(super) fn merge_one_shard(
    main_conn: &mut rusqlite::Connection,
    shard_db_path: &Path,
    snapshot_id: i64,
) -> Result<MergePhaseStats, PipelineError> {
    let source_id: i64 = main_conn.query_row(
        "SELECT source_id FROM source_snapshot WHERE snapshot_id = ?1",
        [snapshot_id],
        |row| row.get(0),
    )?;
    let reliability_rank: i64 = main_conn.query_row(
        "SELECT reliability_rank FROM source_registry WHERE source_id = ?1",
        [source_id],
        |row| row.get(0),
    )?;

    let tx = main_conn.transaction()?;
    let shard_path = shard_db_path.to_string_lossy().to_string();
    let mut stats = MergePhaseStats::default();

    let t = Instant::now();
    tx.execute("ATTACH DATABASE ?1 AS shard", params![shard_path])?;
    stats.attach_detach_secs += t.elapsed().as_secs_f64();

    let t = Instant::now();
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
    stats.prepare_secs = t.elapsed().as_secs_f64();

    let t = Instant::now();
    tx.execute_batch(MERGE_CORE_SQL)?;
    stats.core_secs = t.elapsed().as_secs_f64();

    let merge_phone_sql = MERGE_PHONE_SQL
        .replace("{snapshot_id}", &snapshot_id.to_string())
        .replace("{reliability_rank}", &reliability_rank.to_string());
    let t = Instant::now();
    tx.execute_batch(&merge_phone_sql)?;
    stats.phone_secs = t.elapsed().as_secs_f64();

    let merge_email_sql = MERGE_EMAIL_SQL
        .replace("{source_id}", &source_id.to_string())
        .replace("{reliability_rank}", &reliability_rank.to_string());
    let t = Instant::now();
    tx.execute_batch(&merge_email_sql)?;
    stats.email_secs = t.elapsed().as_secs_f64();

    let t = Instant::now();
    tx.execute_batch(
        r#"
        INSERT OR IGNORE INTO projection_dirty_doc(doc_id)
        SELECT DISTINCT rf.doc_id
        FROM tmp_resolved_facts rf
        JOIN tmp_row_delta delta ON delta.source_row_number = rf.source_row_number
        WHERE rf.doc_id IS NOT NULL;

        INSERT OR IGNORE INTO projection_dirty_doc(doc_id)
        SELECT DISTINCT cr.doc_id
        FROM tmp_resolved_facts rf
        JOIN tmp_row_delta delta ON delta.source_row_number = rf.source_row_number
        JOIN company_role cr ON cr.company_id = rf.company_id
        WHERE rf.company_id IS NOT NULL AND cr.doc_id IS NOT NULL;

        INSERT OR IGNORE INTO projection_dirty_company(company_id)
        SELECT DISTINCT rf.company_id
        FROM tmp_resolved_facts rf
        JOIN tmp_row_delta delta ON delta.source_row_number = rf.source_row_number
        WHERE rf.company_id IS NOT NULL;
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
    stats.core_secs += t.elapsed().as_secs_f64();

    let t = Instant::now();
    tx.execute_batch(MERGE_CLEANUP_SQL)?;
    stats.cleanup_secs = t.elapsed().as_secs_f64();
    tx.commit()?;

    let t = Instant::now();
    main_conn.execute("DETACH DATABASE shard", [])?;
    stats.attach_detach_secs += t.elapsed().as_secs_f64();

    Ok(stats)
}
