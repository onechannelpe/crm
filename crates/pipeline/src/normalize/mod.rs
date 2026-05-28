mod doc;
mod email;
mod extract;
mod phone;
mod translate;

pub use doc::{
    derive_dni_from_natural_ruc, normalize_ambiguous_doc,
    normalize_person_document_with_natural_ruc,
};
pub use extract::{ResolvedMapping, resolve_mapping};
pub use phone::{PhoneKind, normalize_phone_with_kind};

use csv::StringRecord;
use sha2::{Digest, Sha256};

// ---------------------------------------------------------------------------
// Public output type
// ---------------------------------------------------------------------------

#[derive(Default)]
pub struct NormalizedRow {
    pub person_dni: Option<String>,
    pub person_natural_ruc: Option<String>,
    pub had_person_doc_input: bool,
    pub had_rep_doc_input: bool,
    pub person_full_name: String,
    pub email: Option<String>,
    pub company_ruc: Option<String>,
    pub had_company_ruc_input: bool,
    pub company_name: String,
    pub role_name: String,
    pub role_start_date: String,
    pub rep_doc_type: String,
    pub rep_doc_number: String,
    pub rep_name: String,
    pub phones: Vec<String>,
    pub had_phone_input: bool,
    pub invalid_phone_reasons: Vec<String>,
    pub company_status: String,
    pub company_condition: String,
    pub company_type: String,
    pub economic_activity: String,
    pub company_ubigeo: String,
    pub company_department: String,
    pub company_province: String,
    pub company_district: String,
}

// ---------------------------------------------------------------------------
// Private intermediate form between Stage 1 and Stage 3
// ---------------------------------------------------------------------------

struct FieldValues {
    person_dni: String,
    person_or_company_doc: String,
    rep_doc_type: String,
    rep_doc_number: String,
    person_full_name: String,
    rep_name: String,
    company_ruc: String,
    company_name: String,
    role_name: String,
    role_start_date: String,
    email: String,
    phones_raw: Vec<String>,
    had_phone_input: bool,
    company_status: String,
    company_condition: String,
    company_type: String,
    economic_activity: String,
    company_ubigeo: String,
    company_department: String,
    company_province: String,
    company_district: String,
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

/// Runs the three-stage pipeline for a single record:
/// Stage 1 (extract) -> Stage 2 (translate) -> Stage 3 (normalize).
pub fn normalize_row(resolved: &ResolvedMapping, record: &StringRecord) -> NormalizedRow {
    let raw = extract::extract_fields(resolved, record);
    let raw = translate::apply(raw, &resolved.doc_type_map);
    build_normalized(raw)
}

pub fn hash_record(record: &StringRecord, delimiter: &str) -> String {
    let mut hasher = Sha256::new();
    let mut iter = record.iter();
    if let Some(first) = iter.next() {
        hasher.update(first.as_bytes());
    }
    for field in iter {
        hasher.update(delimiter.as_bytes());
        hasher.update(field.as_bytes());
    }
    hex::encode(hasher.finalize())
}

// ---------------------------------------------------------------------------
// Stage 3: build NormalizedRow from translated FieldValues
// ---------------------------------------------------------------------------

fn build_normalized(raw: FieldValues) -> NormalizedRow {
    let (person_dni_from_person_doc, person_natural_ruc_from_person_doc) =
        doc::normalize_person_document_with_natural_ruc(&raw.person_dni);

    let (doc_person_dni, doc_natural_ruc, doc_company_ruc) =
        doc::normalize_ambiguous_doc(&raw.person_or_company_doc);

    let doc_resolved_to_person = doc_person_dni.is_some() || doc_natural_ruc.is_some();
    let doc_resolved_to_company = doc_company_ruc.is_some();
    let doc_unresolved = !raw.person_or_company_doc.is_empty()
        && !doc_resolved_to_person
        && !doc_resolved_to_company;

    let person_dni = person_dni_from_person_doc.or(doc_person_dni);
    let person_natural_ruc = person_natural_ruc_from_person_doc.or(doc_natural_ruc);
    let company_ruc = doc::normalize_ruc(&raw.company_ruc).or(doc_company_ruc);

    let had_rep_doc_input = !raw.rep_doc_type.is_empty() && !raw.rep_doc_number.is_empty();
    let (rep_doc_type, rep_doc_number) =
        doc::normalize_doc(&raw.rep_doc_type, &raw.rep_doc_number).unwrap_or_default();

    let (phones, invalid_phone_reasons) = phone::normalize_phones(raw.phones_raw);

    NormalizedRow {
        person_dni,
        person_natural_ruc,
        had_person_doc_input: !raw.person_dni.is_empty()
            || doc_resolved_to_person
            || doc_unresolved,
        had_rep_doc_input,
        person_full_name: if !raw.person_full_name.is_empty() {
            raw.person_full_name
        } else {
            raw.rep_name.clone()
        },
        company_ruc,
        had_company_ruc_input: !raw.company_ruc.is_empty() || doc_resolved_to_company,
        company_name: raw.company_name,
        role_name: raw.role_name,
        role_start_date: raw.role_start_date,
        email: email::normalize_email(&raw.email),
        rep_doc_type,
        rep_doc_number,
        rep_name: raw.rep_name,
        phones,
        had_phone_input: raw.had_phone_input,
        invalid_phone_reasons,
        company_status: raw.company_status,
        company_condition: raw.company_condition,
        company_type: raw.company_type,
        economic_activity: raw.economic_activity,
        company_ubigeo: raw.company_ubigeo,
        company_department: raw.company_department,
        company_province: raw.company_province,
        company_district: raw.company_district,
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::extract::ResolvedMapping;
    use super::*;
    use csv::StringRecord;
    use std::collections::HashMap;

    fn resolved_with_fields(fields: HashMap<String, Option<usize>>) -> ResolvedMapping {
        ResolvedMapping::for_test(fields, Vec::new())
    }

    #[test]
    fn location_fields_treat_no_disponible_as_missing() {
        let fields = HashMap::from([
            ("company_ubigeo".to_owned(), Some(0)),
            ("company_department".to_owned(), Some(1)),
            ("company_province".to_owned(), Some(2)),
            ("company_district".to_owned(), Some(3)),
        ]);
        let resolved = resolved_with_fields(fields);
        let record = StringRecord::from(vec![
            "NO DISPONIBLE",
            " no disponible ",
            "NO DISPONIBLE",
            "NO DISPONIBLE",
        ]);
        let row = normalize_row(&resolved, &record);
        assert_eq!(row.company_ubigeo, "");
        assert_eq!(row.company_department, "");
        assert_eq!(row.company_province, "");
        assert_eq!(row.company_district, "");
    }

    #[test]
    fn location_fields_strips_whitespace_from_valid_values() {
        let fields = HashMap::from([
            ("company_ubigeo".to_owned(), Some(0)),
            ("company_department".to_owned(), Some(1)),
        ]);
        let resolved = resolved_with_fields(fields);
        let record = StringRecord::from(vec!["  150101  ", "  LIMA  "]);
        let row = normalize_row(&resolved, &record);
        assert_eq!(row.company_ubigeo, "150101");
        assert_eq!(row.company_department, "LIMA");
    }

    #[test]
    fn location_fields_keep_valid_values() {
        let fields = HashMap::from([
            ("company_ubigeo".to_owned(), Some(0)),
            ("company_department".to_owned(), Some(1)),
            ("company_province".to_owned(), Some(2)),
            ("company_district".to_owned(), Some(3)),
        ]);
        let resolved = resolved_with_fields(fields);
        let record = StringRecord::from(vec!["150101", "LIMA", "LIMA", "LIMA"]);
        let row = normalize_row(&resolved, &record);
        assert_eq!(row.company_ubigeo, "150101");
        assert_eq!(row.company_department, "LIMA");
        assert_eq!(row.company_province, "LIMA");
        assert_eq!(row.company_district, "LIMA");
    }

    #[test]
    fn doc_type_map_translates_before_normalize() {
        let mut doc_type_map = HashMap::new();
        doc_type_map.insert("01".to_owned(), "DNI".to_owned());
        let fields = HashMap::from([
            ("rep_doc_type".to_owned(), Some(0)),
            ("rep_doc_number".to_owned(), Some(1)),
        ]);
        let resolved = ResolvedMapping {
            fields,
            phone_columns: Vec::new(),
            doc_type_map,
        };
        let record = StringRecord::from(vec!["01", "12345678"]);
        let row = normalize_row(&resolved, &record);
        assert_eq!(row.rep_doc_type, "DNI");
        assert_eq!(row.rep_doc_number, "12345678");
    }
}
