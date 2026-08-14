use crate::PipelineError;
use crate::config::mapping::SourceMapping;
use crate::normalize::{self, ResolvedMapping};
use csv::ReaderBuilder;
use std::path::Path;
use std::sync::mpsc::SyncSender;

use super::session::ShardTask;

pub fn map_snapshot_only(mapping_path: &str, input_path: &str) -> Result<usize, PipelineError> {
    if !Path::new(input_path).exists() {
        return Err(PipelineError::Args(format!(
            "input path does not exist: {input_path}"
        )));
    }

    let mapping = SourceMapping::from_path(mapping_path)?;
    let mut reader = ReaderBuilder::new()
        .delimiter(mapping.delimiter_byte())
        .has_headers(mapping.has_header)
        .flexible(mapping.flexible)
        .from_path(input_path)?;

    let headers = if mapping.has_header {
        let byte_headers = reader.byte_headers()?.clone();
        Some(mapping.decode_byte_record(&byte_headers)?)
    } else {
        None
    };
    let resolved_mapping = normalize::resolve_mapping(&mapping, headers.as_ref())?;

    let mut total_rows = 0usize;
    for result in reader.byte_records() {
        let byte_record = result?;
        let record = mapping.decode_byte_record(&byte_record)?;
        let _row = normalize::normalize_row(&resolved_mapping, &record);
        total_rows += 1;
    }
    Ok(total_rows)
}

pub(super) fn resolve_mapping_for_path(
    mapping: &SourceMapping,
    input_path: &str,
) -> Result<ResolvedMapping, PipelineError> {
    let mut header_reader = ReaderBuilder::new()
        .delimiter(mapping.delimiter_byte())
        .has_headers(mapping.has_header)
        .flexible(mapping.flexible)
        .from_path(input_path)?;
    let headers = if mapping.has_header {
        let byte_headers = header_reader.byte_headers()?.clone();
        Some(mapping.decode_byte_record(&byte_headers)?)
    } else {
        None
    };
    normalize::resolve_mapping(mapping, headers.as_ref())
}

pub(super) fn dispatch_records(
    mapping: &SourceMapping,
    input_path: &str,
    workers: usize,
    task_senders: &[SyncSender<ShardTask>],
    max_rows: i64,
) -> Result<i64, PipelineError> {
    let mut reader = ReaderBuilder::new()
        .delimiter(mapping.delimiter_byte())
        .has_headers(mapping.has_header)
        .flexible(mapping.flexible)
        .from_path(input_path)?;

    if mapping.has_header {
        let _ = reader.byte_headers()?;
    }

    let mut total_rows = 0i64;
    for (i, result) in reader.byte_records().enumerate() {
        let byte_record = result?;
        let record = mapping.decode_byte_record(&byte_record)?;
        let source_row_number = (i + 1) as i64;
        if source_row_number > max_rows {
            return Err(PipelineError::Args(format!(
                "row count exceeds the configured maximum of {max_rows} rows"
            )));
        }
        let worker_index = i % workers;
        task_senders[worker_index]
            .send(ShardTask {
                source_row_number,
                record,
            })
            .map_err(|err| {
                PipelineError::Args(format!(
                    "failed to dispatch record to shard worker {worker_index}: {err}"
                ))
            })?;
        total_rows += 1;
    }
    Ok(total_rows)
}
