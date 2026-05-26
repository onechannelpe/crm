use crate::PipelineError;
use crate::config::mapping::SourceMapping;
use crate::normalize::canonical;
use csv::ReaderBuilder;
use std::path::Path;

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
    let resolved_mapping = canonical::resolve_mapping(&mapping, headers.as_ref())?;

    let mut total_rows = 0usize;
    for result in reader.byte_records() {
        let byte_record = result?;
        let record = mapping.decode_byte_record(&byte_record)?;
        let _row = canonical::map_record(&resolved_mapping, &record);
        total_rows += 1;
    }
    Ok(total_rows)
}
