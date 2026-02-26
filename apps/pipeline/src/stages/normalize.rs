#[path = "normalize_row.rs"]
mod row;

use crate::PipelineError;
use crate::config::manifest::{SourceManifestEntry, load_manifest, verify_manifest};
use crate::config::mapping::SourceMapping;
use crate::domain::normalize_helpers::{
    PhoneKind, derive_dni_from_natural_ruc, normalize_dni, normalize_phone_with_kind,
    normalize_ruc,
};
use csv::ReaderBuilder;
use std::fs;
use std::path::Path;

#[derive(Default, serde::Serialize)]
struct NormalizationSummary {
    source_key: String,
    snapshot_label: String,
    reliability_rank: i64,
    priority: i64,
    total_rows: usize,
    normalized_rows: usize,
    error_rows: usize,
    invalid_dni_rows: usize,
    invalid_ruc_rows: usize,
    invalid_phone_rows: usize,
    empty_payload_rows: usize,
    mobile_phone_rows: usize,
    fixed_phone_rows: usize,
}

pub fn normalize_source(
    manifest_path: &str,
    source_key: &str,
    row_cap: usize,
    out_dir: &str,
) -> Result<(), PipelineError> {
    let manifest = load_manifest(manifest_path)?;
    let source = manifest
        .sources
        .iter()
        .find(|s| s.source_key == source_key)
        .ok_or_else(|| PipelineError::Args(format!("source key not found: {source_key}")))?;
    normalize_source_entry(source, row_cap, out_dir)
}

pub fn normalize_matrix(
    manifest_path: &str,
    row_cap: usize,
    out_dir: &str,
) -> Result<(), PipelineError> {
    let manifest = verify_manifest(manifest_path)?;

    for source in &manifest.sources {
        if !source.enabled {
            continue;
        }
        normalize_source_entry(source, row_cap, out_dir)?;
    }
    Ok(())
}

fn normalize_source_entry(
    source: &SourceManifestEntry,
    row_cap: usize,
    out_dir: &str,
) -> Result<(), PipelineError> {
    let mapping = SourceMapping::from_path(&source.mapping_path)?;
    let target_dir = Path::new(out_dir)
        .join(&source.source_key)
        .join(&source.snapshot_label);
    fs::create_dir_all(&target_dir)?;

    let normalized_path = target_dir.join("normalized.part-00001.csv");
    let errors_path = target_dir.join("errors.csv");
    let summary_path = target_dir.join("summary.json");

    let mut normalized_writer = csv::WriterBuilder::new()
        .has_headers(true)
        .from_path(&normalized_path)?;
    let mut error_writer = csv::WriterBuilder::new()
        .has_headers(true)
        .from_path(&errors_path)?;

    normalized_writer.write_record([
        "source_key",
        "snapshot_label",
        "snapshot_date",
        "source_row_number",
        "record_hash",
        "person_dni",
        "person_full_name",
        "company_ruc",
        "company_name",
        "rep_doc_type",
        "rep_doc_number",
        "rep_name",
        "role_name",
        "role_start_date",
        "phone",
        "phone_type",
    ])?;
    error_writer.write_record([
        "source_key",
        "snapshot_label",
        "source_row_number",
        "error_code",
        "error_detail",
        "raw_payload",
    ])?;

    let mut reader = ReaderBuilder::new()
        .delimiter(mapping.delimiter_byte())
        .has_headers(mapping.has_header)
        .flexible(mapping.flexible)
        .from_path(&source.raw_path)?;

    let headers = if mapping.has_header {
        Some(reader.byte_headers()?.clone())
    } else {
        None
    };
    let header_index = row::build_header_index_bytes(headers.as_ref());

    let mut summary = NormalizationSummary {
        source_key: source.source_key.clone(),
        snapshot_label: source.snapshot_label.clone(),
        reliability_rank: source.reliability_rank,
        priority: source.priority,
        ..NormalizationSummary::default()
    };

    for (row_idx, row_result) in reader.byte_records().enumerate() {
        if row_idx >= row_cap {
            break;
        }
        let source_row_number = row_idx + 1;

        let row_record = match row_result {
            Ok(record) => record,
            Err(err) => {
                summary.total_rows += 1;
                summary.error_rows += 1;
                error_writer.write_record([
                    source.source_key.as_str(),
                    source.snapshot_label.as_str(),
                    &source_row_number.to_string(),
                    "csv_parse_error",
                    &err.to_string(),
                    "",
                ])?;
                continue;
            }
        };

        summary.total_rows += 1;
        let delimiter = mapping.delimiter_byte();
        let raw_payload = row_record
            .iter()
            .map(|v| String::from_utf8_lossy(v).to_string())
            .collect::<Vec<_>>()
            .join(&(delimiter as char).to_string());
        let record_hash = row::hash_record_bytes(&row_record, delimiter);

        let person_dni_raw = row::mapped_value_bytes(
            "person_dni",
            &mapping,
            &row_record,
            headers.as_ref(),
            header_index.as_ref(),
        )?;
        let person_dni = resolve_person_dni(&person_dni_raw);
        let company_ruc_raw = row::mapped_value_bytes(
            "company_ruc",
            &mapping,
            &row_record,
            headers.as_ref(),
            header_index.as_ref(),
        )?;
        let company_ruc = normalize_ruc(&company_ruc_raw);
        let person_full_name = row::mapped_value_bytes(
            "person_full_name",
            &mapping,
            &row_record,
            headers.as_ref(),
            header_index.as_ref(),
        )?;
        let company_name = row::mapped_value_bytes(
            "company_name",
            &mapping,
            &row_record,
            headers.as_ref(),
            header_index.as_ref(),
        )?;
        let rep_doc_type = row::mapped_value_bytes(
            "rep_doc_type",
            &mapping,
            &row_record,
            headers.as_ref(),
            header_index.as_ref(),
        )?;
        let rep_doc_number = row::mapped_value_bytes(
            "rep_doc_number",
            &mapping,
            &row_record,
            headers.as_ref(),
            header_index.as_ref(),
        )?;
        let rep_name = row::mapped_value_bytes(
            "rep_name",
            &mapping,
            &row_record,
            headers.as_ref(),
            header_index.as_ref(),
        )?;
        let role_name = row::mapped_value_bytes(
            "role_name",
            &mapping,
            &row_record,
            headers.as_ref(),
            header_index.as_ref(),
        )?;
        let role_start_date = row::mapped_value_bytes(
            "role_start_date",
            &mapping,
            &row_record,
            headers.as_ref(),
            header_index.as_ref(),
        )?;

        let (phones, had_phone_input, invalid_phone_reasons) = row::collect_phones_bytes(
            &mapping,
            &row_record,
            headers.as_ref(),
            header_index.as_ref(),
        )?;

        let mut errors: Vec<&str> = Vec::new();
        if !person_dni_raw.is_empty() && person_dni.is_none() {
            summary.invalid_dni_rows += 1;
            errors.push("invalid_dni");
        }
        if !company_ruc_raw.is_empty() && company_ruc.is_none() {
            summary.invalid_ruc_rows += 1;
            errors.push("invalid_ruc");
        }
        let mut invalid_phone_detail = String::new();
        if had_phone_input && phones.is_empty() {
            summary.invalid_phone_rows += 1;
            errors.push("invalid_phone");
            invalid_phone_detail = invalid_phone_reasons.join(";");
        }

        let has_any_payload = person_dni.is_some()
            || company_ruc.is_some()
            || !person_full_name.is_empty()
            || !company_name.is_empty()
            || !rep_doc_type.is_empty()
            || !rep_doc_number.is_empty()
            || !rep_name.is_empty()
            || !role_name.is_empty()
            || !phones.is_empty();

        if !has_any_payload {
            summary.empty_payload_rows += 1;
            errors.push("empty_payload");
        }

        if !errors.is_empty() {
            summary.error_rows += 1;
            error_writer.write_record([
                source.source_key.as_str(),
                source.snapshot_label.as_str(),
                &source_row_number.to_string(),
                &errors.join(";"),
                &invalid_phone_detail,
                &raw_payload,
            ])?;
        }

        if has_any_payload {
            if phones.is_empty() {
                normalized_writer.write_record([
                    source.source_key.as_str(),
                    source.snapshot_label.as_str(),
                    source.snapshot_date.as_str(),
                    &source_row_number.to_string(),
                    &record_hash,
                    person_dni.as_deref().unwrap_or(""),
                    &person_full_name,
                    company_ruc.as_deref().unwrap_or(""),
                    &company_name,
                    &rep_doc_type,
                    &rep_doc_number,
                    &rep_name,
                    &role_name,
                    &role_start_date,
                    "",
                    "",
                ])?;
                summary.normalized_rows += 1;
            } else {
                for phone in phones {
                    let phone_type = match normalize_phone_with_kind(&phone) {
                        Some((_, PhoneKind::Mobile)) => {
                            summary.mobile_phone_rows += 1;
                            "mobile"
                        }
                        Some((_, PhoneKind::Fixed)) => {
                            summary.fixed_phone_rows += 1;
                            "fixed"
                        }
                        None => "",
                    };
                    normalized_writer.write_record([
                        source.source_key.as_str(),
                        source.snapshot_label.as_str(),
                        source.snapshot_date.as_str(),
                        &source_row_number.to_string(),
                        &record_hash,
                        person_dni.as_deref().unwrap_or(""),
                        &person_full_name,
                        company_ruc.as_deref().unwrap_or(""),
                        &company_name,
                        &rep_doc_type,
                        &rep_doc_number,
                        &rep_name,
                        &role_name,
                        &role_start_date,
                        &phone,
                        phone_type,
                    ])?;
                    summary.normalized_rows += 1;
                }
            }
        }
    }

    normalized_writer.flush()?;
    error_writer.flush()?;
    fs::write(summary_path, serde_json::to_string_pretty(&summary)?)?;
    println!("{}", serde_json::to_string(&summary)?);
    Ok(())
}

fn resolve_person_dni(raw_document: &str) -> Option<String> {
    normalize_dni(raw_document).or_else(|| {
        normalize_ruc(raw_document).and_then(|ruc| derive_dni_from_natural_ruc(&ruc))
    })
}

#[cfg(test)]
mod tests {
    use super::resolve_person_dni;

    #[test]
    fn resolves_dni_from_natural_person_ruc_document() {
        assert_eq!(resolve_person_dni("10441792498"), Some("44179249".to_owned()));
        assert_eq!(resolve_person_dni("044179249"), None);
        assert_eq!(resolve_person_dni("00023AT1919"), None);
    }
}
