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

    // National fixed-line without country code (common source patterns: 7/8 digits).
    let first = cleaned.chars().next()?;
    if (cleaned.len() == 7 || cleaned.len() == 8) && ('1'..='8').contains(&first) {
        return Some((cleaned, PhoneKind::Fixed));
    }

    None
}

pub fn normalize_phone(value: &str) -> Option<String> {
    normalize_phone_with_kind(value).map(|(phone, _)| phone)
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
    Some(ruc[2..10].to_owned())
}

pub fn normalize_person_document_with_natural_ruc(
    value: &str,
) -> (Option<String>, Option<String>) {
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

#[cfg(test)]
mod tests {
    use super::{
        PhoneKind, derive_dni_from_natural_ruc, normalize_person_document_with_natural_ruc,
        normalize_phone, normalize_phone_with_kind,
    };

    #[test]
    fn normalizes_phone_without_country_code_storage() {
        assert_eq!(normalize_phone("51987111222"), Some("987111222".to_owned()));
        assert_eq!(normalize_phone("987111222"), Some("987111222".to_owned()));
        assert_eq!(normalize_phone("123"), None);
    }

    #[test]
    fn classifies_mobile_and_fixed_phones() {
        assert_eq!(
            normalize_phone_with_kind("51987111222"),
            Some(("987111222".to_owned(), PhoneKind::Mobile))
        );
        assert_eq!(
            normalize_phone_with_kind("5154252803"),
            Some(("54252803".to_owned(), PhoneKind::Fixed))
        );
        assert_eq!(
            normalize_phone_with_kind("513826193"),
            Some(("3826193".to_owned(), PhoneKind::Fixed))
        );
        assert_eq!(normalize_phone_with_kind("51CID.814791"), None);
    }

    #[test]
    fn derives_dni_from_natural_ruc() {
        assert_eq!(
            derive_dni_from_natural_ruc("10123456789"),
            Some("12345678".to_owned())
        );
        assert_eq!(derive_dni_from_natural_ruc("20123456789"), None);
    }

    #[test]
    fn normalizes_person_document_with_natural_ruc() {
        assert_eq!(
            normalize_person_document_with_natural_ruc("12345678"),
            (Some("12345678".to_owned()), None)
        );
        assert_eq!(
            normalize_person_document_with_natural_ruc("10441792498"),
            (Some("44179249".to_owned()), Some("10441792498".to_owned()))
        );
        assert_eq!(
            normalize_person_document_with_natural_ruc("00023AT1919"),
            (None, None)
        );
    }
}
