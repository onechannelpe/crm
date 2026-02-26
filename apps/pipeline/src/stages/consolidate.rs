use crate::PipelineError;
use crate::config::mapping::SourceMapping;
use crate::db::repo;
use crate::db::schema::open_rw;
use crate::domain::canonical;
use csv::ReaderBuilder;
use std::path::Path;

#[derive(Default)]
pub(crate) struct IngestCounters {
    pub(crate) total_rows: i64,
    pub(crate) accepted_rows: i64,
    pub(crate) invalid_dni_rows: i64,
    pub(crate) invalid_ruc_rows: i64,
    pub(crate) invalid_phone_rows: i64,
}

pub fn register_snapshot(
    db_path: &str,
    source_key: &str,
    source_name: &str,
    snapshot_label: &str,
    snapshot_date: &str,
    file_path: &str,
    reliability_rank: i64,
) -> Result<(), PipelineError> {
    if !Path::new(file_path).exists() {
        return Err(PipelineError::Args(format!(
            "file path does not exist: {file_path}"
        )));
    }

    let mut conn = open_rw(db_path)?;
    let tx = conn.transaction()?;
    let snapshot_id = repo::upsert_snapshot(
        &tx,
        source_key,
        source_name,
        snapshot_label,
        snapshot_date,
        file_path,
        reliability_rank,
    )?;
    tx.commit()?;
    println!("registered snapshot_id={snapshot_id}");
    Ok(())
}

pub fn ingest_snapshot(
    db_path: &str,
    mapping_path: &str,
    input_path: &str,
    snapshot_label: &str,
    snapshot_date: &str,
    batch_size: usize,
) -> Result<(), PipelineError> {
    if !Path::new(input_path).exists() {
        return Err(PipelineError::Args(format!(
            "input path does not exist: {input_path}"
        )));
    }

    let mapping = SourceMapping::from_path(mapping_path)?;

    let mut conn = open_rw(db_path)?;
    let tx = conn.transaction()?;
    let snapshot_id = repo::upsert_snapshot(
        &tx,
        &mapping.source_key,
        &mapping.source_name,
        snapshot_label,
        snapshot_date,
        input_path,
        100,
    )?;
    tx.execute(
        "UPDATE source_snapshot SET status='loading' WHERE snapshot_id=?1",
        [snapshot_id],
    )?;
    tx.commit()?;

    let mut reader = ReaderBuilder::new()
        .delimiter(mapping.delimiter_byte())
        .has_headers(mapping.has_header)
        .flexible(mapping.flexible)
        .from_path(input_path)?;

    let headers = if mapping.has_header {
        Some(reader.headers()?.clone())
    } else {
        None
    };
    let header_index = canonical::build_header_index(headers.as_ref());

    let mut counters = IngestCounters::default();
    let mut processed_in_batch = 0usize;
    let mut tx = conn.transaction()?;

    for (i, result) in reader.records().enumerate() {
        let record = result?;
        counters.total_rows += 1;
        let source_row_number = (i + 1) as i64;
        let canonical_row =
            canonical::map_record(&mapping, &record, headers.as_ref(), header_index.as_ref())?;
        let accepted = repo::ingest_one_row(
            &tx,
            snapshot_id,
            source_row_number,
            mapping.delimiter.as_str(),
            &record,
            canonical_row,
            &mut counters,
        )?;
        if accepted {
            counters.accepted_rows += 1;
        }

        processed_in_batch += 1;
        if processed_in_batch >= batch_size {
            tx.commit()?;
            tx = conn.transaction()?;
            processed_in_batch = 0;
        }
    }

    repo::persist_metrics(&tx, snapshot_id, &counters)?;
    tx.execute(
        "UPDATE source_snapshot SET status='completed' WHERE snapshot_id=?1",
        [snapshot_id],
    )?;
    tx.commit()?;

    println!(
        "{{\"snapshot_id\":{snapshot_id},\"total_rows\":{},\"accepted_rows\":{},\"invalid_dni_rows\":{},\"invalid_ruc_rows\":{},\"invalid_phone_rows\":{}}}",
        counters.total_rows,
        counters.accepted_rows,
        counters.invalid_dni_rows,
        counters.invalid_ruc_rows,
        counters.invalid_phone_rows
    );
    Ok(())
}
