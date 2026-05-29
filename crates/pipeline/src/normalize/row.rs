use super::{doc, email, phone};

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

pub(super) struct FieldValues {
    pub person_dni: String,
    pub person_or_company_doc: String,
    pub rep_doc_type: String,
    pub rep_doc_number: String,
    pub person_full_name: String,
    pub rep_name: String,
    pub company_ruc: String,
    pub company_name: String,
    pub role_name: String,
    pub role_start_date: String,
    pub email: String,
    pub phones_raw: Vec<String>,
    pub had_phone_input: bool,
    pub company_status: String,
    pub company_condition: String,
    pub company_type: String,
    pub economic_activity: String,
    pub company_ubigeo: String,
    pub company_department: String,
    pub company_province: String,
    pub company_district: String,
}

pub(super) fn build(raw: FieldValues) -> NormalizedRow {
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
