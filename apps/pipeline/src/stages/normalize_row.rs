use crate::PipelineError;
use crate::config::mapping::SourceMapping;
use crate::domain::normalize_helpers::{
    normalize_phone, normalize_phone_with_kind, normalize_text,
};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};

pub(super) fn mapped_value_bytes(
    canonical: &str,
    mapping: &SourceMapping,
    record: &csv::ByteRecord,
    headers: Option<&csv::ByteRecord>,
    header_index: Option<&HashMap<String, usize>>,
) -> Result<String, PipelineError> {
    let Some(column) = mapping.fields.get(canonical) else {
        return Ok(String::new());
    };

    let Some(raw) = value_from_column_bytes(column, record, headers, header_index)? else {
        return Ok(String::new());
    };

    Ok(normalize_text(&raw))
}

pub(super) fn value_from_column_bytes(
    column: &str,
    record: &csv::ByteRecord,
    headers: Option<&csv::ByteRecord>,
    header_index: Option<&HashMap<String, usize>>,
) -> Result<Option<String>, PipelineError> {
    if let Ok(index) = column.parse::<usize>() {
        let value = record.get(index).unwrap_or(b"");
        return Ok(Some(String::from_utf8_lossy(value).to_string()));
    }

    let Some(hdrs) = headers else {
        return Err(PipelineError::Args(format!(
            "column mapping requires header, but source has no header: {column}"
        )));
    };
    let Some(indexes) = header_index else {
        return Err(PipelineError::Args("missing header index".to_owned()));
    };

    let has_header = hdrs
        .iter()
        .any(|h| String::from_utf8_lossy(h).as_ref() == column);
    if !has_header {
        return Ok(None);
    }

    let Some(idx) = indexes.get(column) else {
        return Ok(None);
    };
    let value = record.get(*idx).unwrap_or(b"");
    Ok(Some(String::from_utf8_lossy(value).to_string()))
}

pub(super) fn collect_phones_bytes(
    mapping: &SourceMapping,
    record: &csv::ByteRecord,
    headers: Option<&csv::ByteRecord>,
    header_index: Option<&HashMap<String, usize>>,
) -> Result<(Vec<String>, bool, Vec<String>), PipelineError> {
    let mut raw_values = Vec::new();
    let mut had_phone_input = false;

    let direct_phone = mapped_value_bytes("phone", mapping, record, headers, header_index)?;
    if !direct_phone.is_empty() {
        had_phone_input = true;
        raw_values.push(direct_phone);
    }

    for column in &mapping.phone_columns {
        if let Some(value) = value_from_column_bytes(column, record, headers, header_index)?
            && !value.is_empty()
        {
            had_phone_input = true;
            raw_values.push(value);
        }
    }

    if let Some(hdr) = headers {
        for (idx, name) in hdr.iter().enumerate() {
            let name = String::from_utf8_lossy(name);
            for prefix in &mapping.phone_prefixes {
                if name.starts_with(prefix) {
                    let value = String::from_utf8_lossy(record.get(idx).unwrap_or(b"")).to_string();
                    if !value.is_empty() {
                        had_phone_input = true;
                        raw_values.push(value);
                    }
                    break;
                }
            }
        }
    }

    let mut unique = HashSet::new();
    let mut phones = Vec::new();
    let mut invalid_reasons = HashSet::new();
    for value in raw_values {
        if let Some(phone) = normalize_phone(&value)
            && unique.insert(phone.clone())
        {
            phones.push(phone);
            continue;
        }

        if let Some(reason) = classify_phone_issue(&value) {
            invalid_reasons.insert(reason.to_owned());
        }
    }

    let mut reason_list: Vec<String> = invalid_reasons.into_iter().collect();
    reason_list.sort();
    Ok((phones, had_phone_input, reason_list))
}

fn classify_phone_issue(value: &str) -> Option<&'static str> {
    if value.trim().is_empty() {
        return None;
    }

    if normalize_phone_with_kind(value).is_some() {
        return None;
    }

    if value.chars().any(|c| c.is_alphabetic()) {
        return Some("alphanumeric");
    }

    let digits = value
        .chars()
        .filter(char::is_ascii_digit)
        .collect::<String>();
    if digits.is_empty() {
        return Some("no_digits");
    }

    let normalized = if digits.starts_with("51") && digits.len() >= 9 {
        digits[2..].to_owned()
    } else {
        digits
    };

    match normalized.len() {
        9 => Some("invalid_mobile_prefix"),
        7 | 8 => Some("invalid_fixed_prefix"),
        _ => Some("unsupported_length"),
    }
}

pub(super) fn build_header_index_bytes(
    headers: Option<&csv::ByteRecord>,
) -> Option<HashMap<String, usize>> {
    headers.map(|hdrs| {
        hdrs.iter()
            .enumerate()
            .map(|(idx, name)| (String::from_utf8_lossy(name).to_string(), idx))
            .collect::<HashMap<_, _>>()
    })
}

pub(super) fn hash_record_bytes(record: &csv::ByteRecord, delimiter: u8) -> String {
    let joined = record
        .iter()
        .map(|v| String::from_utf8_lossy(v).to_string())
        .collect::<Vec<_>>()
        .join(&(delimiter as char).to_string());
    let mut hasher = Sha256::new();
    hasher.update(joined.as_bytes());
    hex::encode(hasher.finalize())
}
