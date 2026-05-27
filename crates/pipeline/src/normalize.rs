use crate::PipelineError;
use crate::config::mapping::SourceMapping;
use csv::StringRecord;
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;

// ---------------------------------------------------------------------------
// NormalizedRow: output of the normalize step, input to the ingest step
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
// Mapping resolution
// ---------------------------------------------------------------------------

#[derive(Clone)]
pub struct ResolvedMapping {
    fields: HashMap<String, Option<usize>>,
    phone_columns: Vec<usize>,
}

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
                .any(|prefix| name.starts_with(prefix))
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
    })
}

// ---------------------------------------------------------------------------
// Record mapping
// ---------------------------------------------------------------------------

pub fn map_record(resolved: &ResolvedMapping, record: &StringRecord) -> NormalizedRow {
    let person_dni_raw = mapped_value("person_dni", resolved, record);
    let person_or_company_doc_raw = mapped_value("person_or_company_doc", resolved, record);
    let rep_doc_type_raw = mapped_value("rep_doc_type", resolved, record);
    let rep_doc_number_raw = mapped_value("rep_doc_number", resolved, record);
    let person_full_name = mapped_value("person_full_name", resolved, record);
    let rep_name = mapped_value("rep_name", resolved, record);
    let company_ruc_raw = mapped_value("company_ruc", resolved, record);
    let (phones, had_phone_input, invalid_phone_reasons) = collect_phones(resolved, record);

    let (person_dni_from_person_doc, person_natural_ruc_from_person_doc) =
        normalize_person_document_with_natural_ruc(&person_dni_raw);

    let (doc_person_dni, doc_natural_ruc, doc_company_ruc) =
        normalize_ambiguous_doc(&person_or_company_doc_raw);

    let doc_resolved_to_person = doc_person_dni.is_some() || doc_natural_ruc.is_some();
    let doc_resolved_to_company = doc_company_ruc.is_some();
    let doc_unresolved = !person_or_company_doc_raw.is_empty()
        && !doc_resolved_to_person
        && !doc_resolved_to_company;

    let person_dni = person_dni_from_person_doc.or(doc_person_dni);
    let person_natural_ruc = person_natural_ruc_from_person_doc.or(doc_natural_ruc);
    let company_ruc = normalize_ruc(&company_ruc_raw).or(doc_company_ruc);

    let had_rep_doc_input = !rep_doc_type_raw.is_empty() && !rep_doc_number_raw.is_empty();
    let (rep_doc_type, rep_doc_number) =
        validate_rep_doc(&rep_doc_type_raw, &rep_doc_number_raw).unwrap_or_default();

    NormalizedRow {
        person_dni,
        person_natural_ruc,
        had_person_doc_input: !person_dni_raw.is_empty()
            || doc_resolved_to_person
            || doc_unresolved,
        had_rep_doc_input,
        person_full_name: if !person_full_name.is_empty() {
            person_full_name
        } else {
            rep_name.clone()
        },
        company_ruc,
        had_company_ruc_input: !company_ruc_raw.is_empty() || doc_resolved_to_company,
        company_name: mapped_value("company_name", resolved, record),
        role_name: mapped_value("role_name", resolved, record),
        role_start_date: mapped_value("role_start_date", resolved, record),
        email: normalize_email(&mapped_value("email", resolved, record)),
        rep_doc_type,
        rep_doc_number,
        rep_name,
        phones,
        had_phone_input,
        invalid_phone_reasons,
        company_status: mapped_value("company_status", resolved, record),
        company_condition: mapped_value("company_condition", resolved, record),
        company_type: mapped_value("company_type", resolved, record),
        economic_activity: mapped_value("economic_activity", resolved, record),
        company_ubigeo: normalize_location_value(mapped_value("company_ubigeo", resolved, record)),
        company_department: normalize_location_value(mapped_value(
            "company_department",
            resolved,
            record,
        )),
        company_province: normalize_location_value(mapped_value(
            "company_province",
            resolved,
            record,
        )),
        company_district: normalize_location_value(mapped_value(
            "company_district",
            resolved,
            record,
        )),
    }
}

// ---------------------------------------------------------------------------
// Record hashing
// ---------------------------------------------------------------------------

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
// Document normalization
// ---------------------------------------------------------------------------

pub fn digits(value: &str) -> String {
    value.chars().filter(char::is_ascii_digit).collect()
}

pub fn normalize_dni(value: &str) -> Option<String> {
    let cleaned = digits(value);
    if cleaned.len() == 8 {
        return Some(cleaned);
    }
    None
}

pub fn normalize_ruc(value: &str) -> Option<String> {
    let cleaned = digits(value);
    if cleaned.len() == 11 {
        return Some(cleaned);
    }
    None
}

pub fn validate_rep_doc(doc_type: &str, doc_number: &str) -> Option<(String, String)> {
    let number = doc_number.trim();
    if number.is_empty() {
        return None;
    }
    let dtype = doc_type.trim().to_ascii_uppercase();
    match dtype.as_str() {
        "DNI" => normalize_dni(number).map(|n| ("DNI".into(), n)),
        "CE" | "C.E." | "CARNET DE EXTRANJERIA" | "CARNET EXTRANJERIA" => {
            normalize_alnum_upper(number, 1, 11).map(|n| ("CE".into(), n))
        }
        "PASAPORTE" | "PASSPORT" => {
            normalize_alnum_upper(number, 1, 15).map(|n| ("PASAPORTE".into(), n))
        }
        "PTP" => {
            let n = digits(number);
            (n.len() == 9).then_some(("PTP".into(), n))
        }
        "C.S.R." | "CARNET DE REFUGIO" | "CARNET SOLICITUD REFUGIO" => {
            let n = digits(number);
            ((5..=9).contains(&n.len())).then_some(("CSR".into(), n))
        }
        "C.I.R.E." | "CARNET IDENTIDAD" | "CARNET DE IDENTIDAD" => {
            normalize_alnum_upper(number, 1, 9).map(|n| ("CIRE".into(), n))
        }
        "DOC. IDENT. EXTRANJERO" | "D.I.E." | "DOC.IDENT.EXTRANJERO" | "DOC IDENT EXTRANJERO" => {
            normalize_alnum_upper(number, 1, 15).map(|n| ("DIE".into(), n))
        }
        _ => None,
    }
}

fn normalize_alnum_upper(value: &str, min_len: usize, max_len: usize) -> Option<String> {
    let cleaned: String = value
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect::<String>()
        .to_ascii_uppercase();
    if cleaned.len() >= min_len && cleaned.len() <= max_len {
        Some(cleaned)
    } else {
        None
    }
}

pub fn derive_dni_from_natural_ruc(ruc: &str) -> Option<String> {
    if ruc.len() != 11 {
        return None;
    }
    if !ruc.starts_with("10") {
        return None;
    }
    Some(ruc[2..10].to_owned())
}

pub fn normalize_person_document_with_natural_ruc(value: &str) -> (Option<String>, Option<String>) {
    if let Some(dni) = normalize_dni(value) {
        return (Some(dni), None);
    }
    if let Some(ruc) = normalize_ruc(value)
        && let Some(dni) = derive_dni_from_natural_ruc(&ruc)
    {
        return (Some(dni), Some(ruc));
    }
    (None, None)
}

pub fn normalize_ambiguous_doc(value: &str) -> (Option<String>, Option<String>, Option<String>) {
    if let Some(dni) = normalize_dni(value) {
        return (Some(dni), None, None);
    }
    if let Some(ruc) = normalize_ruc(value) {
        if let Some(dni) = derive_dni_from_natural_ruc(&ruc) {
            return (Some(dni), Some(ruc), None);
        }
        return (None, None, Some(ruc));
    }
    (None, None, None)
}

// ---------------------------------------------------------------------------
// Phone normalization
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PhoneKind {
    Mobile,
    Fixed,
}

pub fn normalize_phone_with_kind(value: &str) -> Option<(String, PhoneKind)> {
    if value.chars().any(|c| c.is_alphabetic()) {
        return None;
    }

    let mut cleaned = digits(value);
    if cleaned.starts_with("51") && cleaned.len() >= 9 {
        cleaned = cleaned[2..].to_owned();
    }

    if cleaned.len() == 9 && cleaned.starts_with('9') {
        return Some((cleaned, PhoneKind::Mobile));
    }

    let first = cleaned.chars().next()?;
    if (cleaned.len() == 7 || cleaned.len() == 8) && ('1'..='8').contains(&first) {
        return Some((cleaned, PhoneKind::Fixed));
    }

    None
}

// ---------------------------------------------------------------------------
// Location normalization: strips whitespace, drops "NO DISPONIBLE" sentinel
// ---------------------------------------------------------------------------

fn normalize_location_value(value: String) -> String {
    let trimmed = value.trim();
    if trimmed.eq_ignore_ascii_case("NO DISPONIBLE") {
        return String::new();
    }
    trimmed.to_owned()
}

// ---------------------------------------------------------------------------
// Email normalization
// ---------------------------------------------------------------------------

fn normalize_email(value: &str) -> Option<String> {
    let at_sign = value.find('@')?;
    if at_sign == 0 {
        return None;
    }
    let local = &value[..at_sign];
    let domain = &value[at_sign + 1..];
    if domain.is_empty() || !domain.contains('.') {
        return None;
    }
    let local_lower = local.to_ascii_lowercase();
    let domain_lower = domain.to_ascii_lowercase();
    if local_lower.starts_with("notiene") {
        return None;
    }
    let blocked_locals = BLOCKED_EMAIL_LOCALS.get_or_init(|| {
        [
            "notienecorreo",
            "dummy",
            "email",
            "null",
            "na",
            "noemail",
            "no",
            "sn",
            "sc",
            "sincorreo",
        ]
        .into_iter()
        .collect()
    });
    if blocked_locals.contains(local_lower.as_str()) {
        return None;
    }
    let blocked_domains = BLOCKED_EMAIL_DOMAINS.get_or_init(|| {
        [
            "dummy.com",
            "email.com.pe",
            "notiene.com",
            "sincorreo.com",
            "sincorreo.com.pe",
        ]
        .into_iter()
        .collect()
    });
    if blocked_domains.contains(domain_lower.as_str()) {
        return None;
    }
    Some(format!("{local_lower}@{domain_lower}"))
}

static BLOCKED_EMAIL_LOCALS: OnceLock<HashSet<&'static str>> = OnceLock::new();
static BLOCKED_EMAIL_DOMAINS: OnceLock<HashSet<&'static str>> = OnceLock::new();

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

pub fn normalize_text(value: &str) -> String {
    value.trim().to_owned()
}

fn collect_phones(
    resolved: &ResolvedMapping,
    record: &StringRecord,
) -> (Vec<String>, bool, Vec<String>) {
    let mut raw_values: Vec<String> = Vec::new();
    let mut had_phone_input = false;

    let direct_phone = mapped_value("phone", resolved, record);
    if !direct_phone.is_empty() {
        had_phone_input = true;
        raw_values.push(direct_phone);
    }

    for index in &resolved.phone_columns {
        let value = record.get(*index).unwrap_or("").to_owned();
        if !value.is_empty() {
            had_phone_input = true;
            raw_values.push(value);
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
    (phones, had_phone_input, reason_list)
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
    let d = value
        .chars()
        .filter(char::is_ascii_digit)
        .collect::<String>();
    if d.is_empty() {
        return Some("no_digits");
    }
    let normalized = if d.starts_with("51") && d.len() >= 9 {
        d[2..].to_owned()
    } else {
        d
    };
    match normalized.len() {
        9 => Some("invalid_mobile_prefix"),
        7 | 8 => Some("invalid_fixed_prefix"),
        _ => Some("unsupported_length"),
    }
}

fn mapped_value(canonical: &str, resolved: &ResolvedMapping, record: &StringRecord) -> String {
    let Some(Some(index)) = resolved.fields.get(canonical) else {
        return String::new();
    };
    normalize_text(record.get(*index).unwrap_or(""))
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
    let Some(index) = indexes.get(column) else {
        return Ok(None);
    };
    Ok(Some(*index))
}

fn build_header_index(headers: Option<&StringRecord>) -> Option<HashMap<String, usize>> {
    headers.map(|h| {
        h.iter()
            .enumerate()
            .map(|(idx, name)| (name.to_owned(), idx))
            .collect::<HashMap<_, _>>()
    })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use csv::StringRecord;

    #[test]
    fn email_valid_passes_through_normalized() {
        assert_eq!(
            normalize_email("Juan.Garcia@Gmail.COM"),
            Some("juan.garcia@gmail.com".to_owned())
        );
    }

    #[test]
    fn email_empty_returns_none() {
        assert_eq!(normalize_email(""), None);
        assert_eq!(normalize_email("@gmail.com"), None);
        assert_eq!(normalize_email("juan@"), None);
        assert_eq!(normalize_email("juan@nodot"), None);
    }

    #[test]
    fn email_blocked_locals_return_none() {
        for local in &[
            "notiene",
            "notienecorreo",
            "dummy",
            "null",
            "na",
            "noemail",
            "no",
            "sn",
            "sc",
            "sincorreo",
        ] {
            let addr = format!("{}@gmail.com", local);
            assert_eq!(normalize_email(&addr), None, "expected None for {addr}");
        }
    }

    #[test]
    fn email_notiene_prefix_variants_return_none() {
        assert_eq!(normalize_email("notiene.notiene@gmail.com"), None);
        assert_eq!(normalize_email("notiene74@gmsil.com"), None);
        assert_eq!(normalize_email("NOTIENE@hotmail.com"), None);
    }

    #[test]
    fn email_blocked_domains_return_none() {
        assert_eq!(normalize_email("user@dummy.com"), None);
        assert_eq!(normalize_email("user@notiene.com"), None);
        assert_eq!(normalize_email("user@sincorreo.com"), None);
        assert_eq!(normalize_email("user@sincorreo.com.pe"), None);
        assert_eq!(normalize_email("user@email.com.pe"), None);
    }

    #[test]
    fn email_spanish_placeholders_return_none() {
        assert_eq!(normalize_email("no@gmail.com"), None);
        assert_eq!(normalize_email("no@hotmail.com"), None);
        assert_eq!(normalize_email("sn@claro.com"), None);
        assert_eq!(normalize_email("sc@claro.com.pe"), None);
        assert_eq!(normalize_email("sincorreo@sincorreo.com"), None);
        assert_eq!(normalize_email("no@notiene.com"), None);
    }

    #[test]
    fn location_fields_treat_no_disponible_as_missing() {
        let mut fields: HashMap<String, Option<usize>> = HashMap::new();
        fields.insert("company_ubigeo".to_owned(), Some(0));
        fields.insert("company_department".to_owned(), Some(1));
        fields.insert("company_province".to_owned(), Some(2));
        fields.insert("company_district".to_owned(), Some(3));

        let resolved = ResolvedMapping {
            fields,
            phone_columns: Vec::new(),
        };
        let record = StringRecord::from(vec![
            "NO DISPONIBLE",
            " no disponible ",
            "NO DISPONIBLE",
            "NO DISPONIBLE",
        ]);

        let row = map_record(&resolved, &record);
        assert_eq!(row.company_ubigeo, "");
        assert_eq!(row.company_department, "");
        assert_eq!(row.company_province, "");
        assert_eq!(row.company_district, "");
    }

    #[test]
    fn location_fields_strips_whitespace_from_valid_values() {
        let mut fields: HashMap<String, Option<usize>> = HashMap::new();
        fields.insert("company_ubigeo".to_owned(), Some(0));
        fields.insert("company_department".to_owned(), Some(1));

        let resolved = ResolvedMapping {
            fields,
            phone_columns: Vec::new(),
        };
        let record = StringRecord::from(vec!["  150101  ", "  LIMA  "]);
        let row = map_record(&resolved, &record);
        assert_eq!(row.company_ubigeo, "150101");
        assert_eq!(row.company_department, "LIMA");
    }

    #[test]
    fn location_fields_keep_valid_values() {
        let mut fields: HashMap<String, Option<usize>> = HashMap::new();
        fields.insert("company_ubigeo".to_owned(), Some(0));
        fields.insert("company_department".to_owned(), Some(1));
        fields.insert("company_province".to_owned(), Some(2));
        fields.insert("company_district".to_owned(), Some(3));

        let resolved = ResolvedMapping {
            fields,
            phone_columns: Vec::new(),
        };
        let record = StringRecord::from(vec!["150101", "LIMA", "LIMA", "LIMA"]);
        let row = map_record(&resolved, &record);
        assert_eq!(row.company_ubigeo, "150101");
        assert_eq!(row.company_department, "LIMA");
        assert_eq!(row.company_province, "LIMA");
        assert_eq!(row.company_district, "LIMA");
    }

    #[test]
    fn cire_accepts_alphanumeric() {
        assert!(validate_rep_doc("C.I.R.E.", "ABC123").is_some());
        assert!(validate_rep_doc("CARNET IDENTIDAD", "A1B2C3").is_some());
    }

    #[test]
    fn cire_rejects_too_long() {
        assert!(validate_rep_doc("C.I.R.E.", "1234567890").is_none());
    }
}
