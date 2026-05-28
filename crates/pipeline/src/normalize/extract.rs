use crate::PipelineError;
use crate::config::mapping::SourceMapping;
use csv::StringRecord;
use std::collections::HashMap;

use super::FieldValues;

/// Precomputed per-source lookup table. Built once from `SourceMapping` at startup,
/// then cloned to each worker thread. Per-row processing only uses `ResolvedMapping`.
#[derive(Clone)]
pub struct ResolvedMapping {
    pub(super) fields: HashMap<String, Option<usize>>,
    pub(super) phone_columns: Vec<usize>,
    pub(super) doc_type_map: HashMap<String, String>,
}

/// Resolves column names to indices and precomputes phone columns and vocabulary
/// maps. Call once per source file before dispatching rows to workers.
pub fn resolve_mapping(
    mapping: &SourceMapping,
    headers: Option<&StringRecord>,
) -> Result<ResolvedMapping, PipelineError> {
    let header_index = build_header_index(headers);
    let mut fields = HashMap::with_capacity(mapping.fields.len());
    for (canonical_field, column_name) in &mapping.fields {
        let resolved = resolve_column(column_name, headers.is_some(), header_index.as_ref())?;
        fields.insert(canonical_field.clone(), resolved);
    }

    let mut phone_columns = Vec::new();
    for column_name in &mapping.phone_columns {
        if let Some(index) = resolve_column(column_name, headers.is_some(), header_index.as_ref())?
        {
            phone_columns.push(index);
        }
    }

    if let Some(hdr) = headers {
        for (idx, name) in hdr.iter().enumerate() {
            if mapping
                .phone_prefixes
                .iter()
                .any(|prefix| name.starts_with(prefix.as_str()))
            {
                phone_columns.push(idx);
            }
        }
    }

    phone_columns.sort_unstable();
    phone_columns.dedup();

    Ok(ResolvedMapping {
        fields,
        phone_columns,
        doc_type_map: mapping.doc_type_map.clone(),
    })
}

/// Extracts raw string values from a record by canonical field name.
/// Strips leading/trailing whitespace and applies the "NO DISPONIBLE" sentinel
/// for location fields. No validation or business logic.
pub(super) fn extract_fields(resolved: &ResolvedMapping, record: &StringRecord) -> FieldValues {
    let direct_phone = field_value("phone", resolved, record);
    let mut phones_raw = Vec::new();
    let mut had_phone_input = false;

    if !direct_phone.is_empty() {
        had_phone_input = true;
        phones_raw.push(direct_phone);
    }

    for &index in &resolved.phone_columns {
        let value = record.get(index).unwrap_or("").trim().to_owned();
        if !value.is_empty() {
            had_phone_input = true;
            phones_raw.push(value);
        }
    }

    FieldValues {
        person_dni: field_value("person_dni", resolved, record),
        person_or_company_doc: field_value("person_or_company_doc", resolved, record),
        rep_doc_type: field_value("rep_doc_type", resolved, record),
        rep_doc_number: field_value("rep_doc_number", resolved, record),
        person_full_name: field_value("person_full_name", resolved, record),
        rep_name: field_value("rep_name", resolved, record),
        company_ruc: field_value("company_ruc", resolved, record),
        company_name: field_value("company_name", resolved, record),
        role_name: field_value("role_name", resolved, record),
        role_start_date: field_value("role_start_date", resolved, record),
        email: field_value("email", resolved, record),
        phones_raw,
        had_phone_input,
        company_status: field_value("company_status", resolved, record),
        company_condition: field_value("company_condition", resolved, record),
        company_type: field_value("company_type", resolved, record),
        economic_activity: field_value("economic_activity", resolved, record),
        company_ubigeo: location_field("company_ubigeo", resolved, record),
        company_department: location_field("company_department", resolved, record),
        company_province: location_field("company_province", resolved, record),
        company_district: location_field("company_district", resolved, record),
    }
}

fn field_value(canonical: &str, resolved: &ResolvedMapping, record: &StringRecord) -> String {
    let Some(Some(index)) = resolved.fields.get(canonical) else {
        return String::new();
    };
    record.get(*index).unwrap_or("").trim().to_owned()
}

fn location_field(canonical: &str, resolved: &ResolvedMapping, record: &StringRecord) -> String {
    let value = field_value(canonical, resolved, record);
    if value.eq_ignore_ascii_case("NO DISPONIBLE") {
        return String::new();
    }
    value
}

fn resolve_column(
    column: &str,
    has_header: bool,
    header_index: Option<&HashMap<String, usize>>,
) -> Result<Option<usize>, PipelineError> {
    if let Ok(index) = column.parse::<usize>() {
        return Ok(Some(index));
    }
    if !has_header {
        return Err(PipelineError::Args(format!(
            "column mapping requires header, but source has no header: {column}"
        )));
    }
    let Some(indexes) = header_index else {
        return Err(PipelineError::Args("missing header index".to_owned()));
    };
    Ok(indexes.get(column).copied())
}

fn build_header_index(headers: Option<&StringRecord>) -> Option<HashMap<String, usize>> {
    headers.map(|h| {
        h.iter()
            .enumerate()
            .map(|(idx, name)| (name.to_owned(), idx))
            .collect()
    })
}

#[cfg(test)]
impl ResolvedMapping {
    pub(super) fn for_test(
        fields: HashMap<String, Option<usize>>,
        phone_columns: Vec<usize>,
    ) -> Self {
        ResolvedMapping {
            fields,
            phone_columns,
            doc_type_map: HashMap::new(),
        }
    }
}
