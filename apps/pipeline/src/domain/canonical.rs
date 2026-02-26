use crate::PipelineError;
use crate::config::mapping::SourceMapping;
use crate::domain::normalize_helpers::{
    derive_dni_from_natural_ruc, normalize_dni, normalize_phone, normalize_ruc, normalize_text,
};
use csv::StringRecord;
use std::collections::{HashMap, HashSet};

#[derive(Default)]
pub(crate) struct CanonicalRow {
    pub(crate) person_dni: Option<String>,
    pub(crate) person_full_name: String,
    pub(crate) company_ruc: Option<String>,
    pub(crate) company_name: String,
    pub(crate) role_name: String,
    pub(crate) role_start_date: String,
    pub(crate) rep_doc_type: String,
    pub(crate) rep_doc_number: String,
    pub(crate) rep_name: String,
    pub(crate) phones: Vec<String>,
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

    Ok(CanonicalRow {
        person_dni: normalize_dni(&person_dni_raw)
            .or_else(|| {
                if rep_doc_type.eq_ignore_ascii_case("DNI") {
                    normalize_dni(&rep_doc_number)
                } else {
                    None
                }
            })
            .or_else(|| {
                normalize_ruc(&company_ruc_raw).and_then(|r| derive_dni_from_natural_ruc(&r))
            }),
        person_full_name: if !person_full_name.is_empty() {
            person_full_name
        } else {
            rep_name.clone()
        },
        company_ruc: normalize_ruc(&company_ruc_raw),
        company_name: mapped_value("company_name", mapping, record, headers, header_index),
        role_name: mapped_value("role_name", mapping, record, headers, header_index),
        role_start_date: mapped_value("role_start_date", mapping, record, headers, header_index),
        rep_doc_type,
        rep_doc_number,
        rep_name,
        phones: collect_phones(mapping, record, headers, header_index)?,
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
) -> Result<Vec<String>, PipelineError> {
    let mut raw_values: Vec<String> = Vec::new();

    let direct_phone = mapped_value("phone", mapping, record, headers, header_index);
    if !direct_phone.is_empty() {
        raw_values.push(direct_phone);
    }

    for column in &mapping.phone_columns {
        if let Some(value) = value_from_column(column, record, headers, header_index)?
            && !value.is_empty()
        {
            raw_values.push(value);
        }
    }

    if let Some(hdr) = headers {
        for (idx, name) in hdr.iter().enumerate() {
            for prefix in &mapping.phone_prefixes {
                if name.starts_with(prefix) {
                    raw_values.push(record.get(idx).unwrap_or("").to_owned());
                    break;
                }
            }
        }
    }

    let mut unique = HashSet::new();
    let mut phones = Vec::new();
    for value in raw_values {
        if let Some(phone) = normalize_phone(&value)
            && unique.insert(phone.clone())
        {
            phones.push(phone);
        }
    }
    Ok(phones)
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
