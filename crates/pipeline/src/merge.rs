use crate::PipelineError;
use crate::ingest::{IngestCounters, IngestSession};
use crate::schema::open_rw;
use rusqlite::{Transaction, params};
use std::path::Path;
use std::time::Instant;

const MERGE_PREPARE_SQL: &str = include_str!("sql/merge_prepare.sql");
const MERGE_CORE_SQL: &str = include_str!("sql/merge_core.sql");
const MERGE_PHONE_SQL: &str = include_str!("sql/merge_phone.sql");
const MERGE_EMAIL_SQL: &str = include_str!("sql/merge_email.sql");
const MERGE_CLEANUP_SQL: &str = include_str!("sql/merge_cleanup.sql");

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

#[derive(Default, Clone, Copy)]
pub struct MergePhaseStats {
    pub prepare_secs: f64,
    pub core_secs: f64,
    pub phone_secs: f64,
    pub email_secs: f64,
    pub cleanup_secs: f64,
    pub attach_detach_secs: f64,
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

pub fn merge_ingest_session(
    db_path: &str,
    session: IngestSession,
) -> Result<MergePhaseStats, PipelineError> {
    let mut conn = open_rw(db_path)?;
    let mut stats = MergePhaseStats::default();

    for shard_result in &session.shard_results {
        let shard_stats =
            merge_one_shard(&mut conn, &shard_result.shard_db_path, session.snapshot_id)?;
        stats.prepare_secs += shard_stats.prepare_secs;
        stats.core_secs += shard_stats.core_secs;
        stats.phone_secs += shard_stats.phone_secs;
        stats.email_secs += shard_stats.email_secs;
        stats.cleanup_secs += shard_stats.cleanup_secs;
        stats.attach_detach_secs += shard_stats.attach_detach_secs;
    }

    if session.dispatched_rows != session.counters.total_rows {
        return Err(fail_snapshot(
            db_path,
            session.snapshot_id,
            PipelineError::Args(format!(
                "sharded ingest row mismatch source={} dispatched={} merged_total={}",
                session.source_key, session.dispatched_rows, session.counters.total_rows
            )),
        ));
    }

    let tx = conn.transaction()?;
    persist_metrics(&tx, session.snapshot_id, &session.counters)?;
    set_snapshot_status(&tx, session.snapshot_id, "merged")?;
    tx.commit()?;

    println!(
        "{{\"snapshot_id\":{},\"total_rows\":{},\"accepted_rows\":{},\"invalid_doc_rows\":{},\"invalid_ruc_rows\":{},\"invalid_phone_rows\":{}}}",
        session.snapshot_id,
        session.counters.total_rows,
        session.counters.accepted_rows,
        session.counters.invalid_doc_rows,
        session.counters.invalid_ruc_rows,
        session.counters.invalid_phone_rows
    );
    Ok(stats)
}

pub fn fail_snapshot(db_path: &str, snapshot_id: i64, err: PipelineError) -> PipelineError {
    if let Err(update_err) = mark_snapshot_failed(db_path, snapshot_id) {
        eprintln!(
            "[pipeline] warning: could not record snapshot {snapshot_id} failure in db: {update_err}"
        );
    }
    err
}

// ---------------------------------------------------------------------------
// Snapshot / source registry helpers (used by ingest.rs and run.rs)
// ---------------------------------------------------------------------------

pub(crate) fn upsert_snapshot(
    tx: &Transaction<'_>,
    source_key: &str,
    source_name: &str,
    snapshot_label: &str,
    snapshot_date: &str,
    file_path: &str,
    reliability_rank: i64,
) -> Result<i64, PipelineError> {
    let mut source_stmt = tx.prepare_cached(
        r#"
        INSERT INTO source_registry(source_key, source_name, reliability_rank)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(source_key) DO UPDATE SET
            source_name=excluded.source_name,
            reliability_rank=excluded.reliability_rank
        RETURNING source_id
        "#,
    )?;
    let source_id: i64 = source_stmt
        .query_row(params![source_key, source_name, reliability_rank], |row| {
            row.get(0)
        })?;

    let mut snap_stmt = tx.prepare_cached(
        r#"
        INSERT INTO source_snapshot(source_id, snapshot_label, snapshot_date, file_path, status)
        VALUES (?1, ?2, ?3, ?4, 'registered')
        ON CONFLICT(source_id, snapshot_label) DO UPDATE SET
            snapshot_date=excluded.snapshot_date,
            file_path=excluded.file_path
        RETURNING snapshot_id
        "#,
    )?;
    let snapshot_id: i64 = snap_stmt.query_row(
        params![source_id, snapshot_label, snapshot_date, file_path],
        |row| row.get(0),
    )?;
    Ok(snapshot_id)
}

pub(crate) fn set_snapshot_status(
    tx: &Transaction<'_>,
    snapshot_id: i64,
    status: &str,
) -> Result<(), PipelineError> {
    tx.execute(
        "UPDATE source_snapshot SET status=?2 WHERE snapshot_id=?1",
        params![snapshot_id, status],
    )?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

fn persist_metrics(
    tx: &Transaction<'_>,
    snapshot_id: i64,
    counters: &IngestCounters,
) -> Result<(), PipelineError> {
    let mut stmt = tx.prepare_cached(
        r#"
        INSERT INTO snapshot_metrics(
            snapshot_id, total_rows, accepted_rows, invalid_doc_rows, invalid_ruc_rows, invalid_phone_rows
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ON CONFLICT(snapshot_id) DO UPDATE SET
            total_rows=excluded.total_rows,
            accepted_rows=excluded.accepted_rows,
            invalid_doc_rows=excluded.invalid_doc_rows,
            invalid_ruc_rows=excluded.invalid_ruc_rows,
            invalid_phone_rows=excluded.invalid_phone_rows
        "#,
    )?;
    stmt.execute(params![
        snapshot_id,
        counters.total_rows,
        counters.accepted_rows,
        counters.invalid_doc_rows,
        counters.invalid_ruc_rows,
        counters.invalid_phone_rows
    ])?;
    Ok(())
}

fn mark_snapshot_failed(db_path: &str, snapshot_id: i64) -> Result<(), PipelineError> {
    let mut conn = open_rw(db_path)?;
    let tx = conn.transaction()?;
    set_snapshot_status(&tx, snapshot_id, "failed")?;
    tx.commit()?;
    Ok(())
}

fn merge_one_shard(
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
