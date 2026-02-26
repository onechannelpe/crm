use crate::PipelineError;
use crate::config::mapping::SourceMapping;
use crate::domain::normalize_helpers::{
    normalize_dni, normalize_person_document_with_natural_ruc, normalize_phone_with_kind,
    normalize_ruc,
    normalize_text,
};
use csv::StringRecord;
use std::collections::{HashMap, HashSet};

#[derive(Default)]
pub(crate) struct CanonicalRow {
    pub(crate) person_dni: Option<String>,
    pub(crate) person_natural_ruc: Option<String>,
    pub(crate) had_person_dni_input: bool,
    pub(crate) person_full_name: String,
    pub(crate) company_ruc: Option<String>,
    pub(crate) had_company_ruc_input: bool,
    pub(crate) company_name: String,
    pub(crate) role_name: String,
    pub(crate) role_start_date: String,
    pub(crate) rep_doc_type: String,
    pub(crate) rep_doc_number: String,
    pub(crate) rep_name: String,
    pub(crate) phones: Vec<String>,
    pub(crate) had_phone_input: bool,
    pub(crate) invalid_phone_reasons: Vec<String>,
}

pub(crate) fn map_record(
    mapping: &SourceMapping,
    record: &StringRecord,
    headers: Option<&StringRecord>,
    header_index: Option<&HashMap<String, usize>>,
) -> Result<CanonicalRow, PipelineError> {
    let person_dni_raw = mapped_value("person_dni", mapping, record, headers, header_index);
    let rep_doc_type = mapped_value("rep_doc_type", mapping, record, headers, header_index);
    let rep_doc_number = mapped_value("rep_doc_number", mapping, record, headers, header_index);
    let person_full_name = mapped_value("person_full_name", mapping, record, headers, header_index);
    let rep_name = mapped_value("rep_name", mapping, record, headers, header_index);
    let company_ruc_raw = mapped_value("company_ruc", mapping, record, headers, header_index);
    let (phones, had_phone_input, invalid_phone_reasons) =
        collect_phones(mapping, record, headers, header_index)?;

    let (person_dni_from_person_doc, person_natural_ruc) =
        normalize_person_document_with_natural_ruc(&person_dni_raw);

    Ok(CanonicalRow {
        person_dni: person_dni_from_person_doc
            .or_else(|| {
                if rep_doc_type.eq_ignore_ascii_case("DNI") {
                    normalize_dni(&rep_doc_number)
                } else {
                    None
                }
            }),
        person_natural_ruc,
        had_person_dni_input: !person_dni_raw.is_empty(),
        person_full_name: if !person_full_name.is_empty() {
            person_full_name
        } else {
            rep_name.clone()
        },
        company_ruc: normalize_ruc(&company_ruc_raw),
        had_company_ruc_input: !company_ruc_raw.is_empty(),
        company_name: mapped_value("company_name", mapping, record, headers, header_index),
        role_name: mapped_value("role_name", mapping, record, headers, header_index),
        role_start_date: mapped_value("role_start_date", mapping, record, headers, header_index),
        rep_doc_type,
        rep_doc_number,
        rep_name,
        phones,
        had_phone_input,
        invalid_phone_reasons,
    })
}

pub(crate) fn build_header_index(headers: Option<&StringRecord>) -> Option<HashMap<String, usize>> {
    headers.map(|h| {
        h.iter()
            .enumerate()
            .map(|(idx, name)| (name.to_owned(), idx))
            .collect::<HashMap<_, _>>()
    })
}

fn collect_phones(
    mapping: &SourceMapping,
    record: &StringRecord,
    headers: Option<&StringRecord>,
    header_index: Option<&HashMap<String, usize>>,
) -> Result<(Vec<String>, bool, Vec<String>), PipelineError> {
    let mut raw_values: Vec<String> = Vec::new();
    let mut had_phone_input = false;

    let direct_phone = mapped_value("phone", mapping, record, headers, header_index);
    if !direct_phone.is_empty() {
        had_phone_input = true;
        raw_values.push(direct_phone);
    }

    for column in &mapping.phone_columns {
        if let Some(value) = value_from_column(column, record, headers, header_index)?
            && !value.is_empty()
        {
            had_phone_input = true;
            raw_values.push(value);
        }
    }

    if let Some(hdr) = headers {
        for (idx, name) in hdr.iter().enumerate() {
            for prefix in &mapping.phone_prefixes {
                if name.starts_with(prefix) {
                    let value = record.get(idx).unwrap_or("").to_owned();
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
        if let Some((phone, _)) = normalize_phone_with_kind(&value)
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

fn mapped_value(
    canonical: &str,
    mapping: &SourceMapping,
    record: &StringRecord,
    headers: Option<&StringRecord>,
    header_index: Option<&HashMap<String, usize>>,
) -> String {
    let Some(column) = mapping.fields.get(canonical) else {
        return String::new();
    };
    value_from_column(column, record, headers, header_index)
        .ok()
        .flatten()
        .map(|v| normalize_text(&v))
        .unwrap_or_default()
}

fn value_from_column(
    column: &str,
    record: &StringRecord,
    headers: Option<&StringRecord>,
    header_index: Option<&HashMap<String, usize>>,
) -> Result<Option<String>, PipelineError> {
    if let Ok(index) = column.parse::<usize>() {
        return Ok(Some(record.get(index).unwrap_or("").to_owned()));
    }

    let Some(hdrs) = headers else {
        return Err(PipelineError::Args(format!(
            "column mapping requires header, but source has no header: {column}"
        )));
    };
    let Some(indexes) = header_index else {
        return Err(PipelineError::Args("missing header index".to_owned()));
    };

    if !hdrs.iter().any(|h| h == column) {
        return Ok(None);
    }
    let idx = indexes
        .get(column)
        .ok_or_else(|| PipelineError::Args(format!("header not found: {column}")))?;
    Ok(Some(record.get(*idx).unwrap_or("").to_owned()))
}
