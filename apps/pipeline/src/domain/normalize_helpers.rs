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

    // Fixed lines are 7 digits (pre-2016 Lima) or 8 digits (post-2016). First digit 1–8
    // distinguishes them from mobiles (9) and operator/special codes (0).
    let first = cleaned.chars().next()?;
    if (cleaned.len() == 7 || cleaned.len() == 8) && ('1'..='8').contains(&first) {
        return Some((cleaned, PhoneKind::Fixed));
    }

    None
}

pub fn normalize_text(value: &str) -> String {
    value.trim().to_owned()
}

pub fn derive_dni_from_natural_ruc(ruc: &str) -> Option<String> {
    if ruc.len() != 11 {
        return None;
    }
    if !ruc.starts_with("10") {
        return None;
    }
    // RUC10 structure: "10" prefix + 8-digit DNI + 1 check digit.
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

/// For columns that hold mixed DNI/RUC types. Person and company buckets are mutually exclusive.
pub fn normalize_ambiguous_doc(
    value: &str,
) -> (Option<String>, Option<String>, Option<String>) {
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
