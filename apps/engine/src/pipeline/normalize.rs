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

pub fn normalize_phone(value: &str) -> Option<String> {
    let mut cleaned = digits(value);
    if cleaned.len() == 11 && cleaned.starts_with("51") {
        cleaned = cleaned[2..].to_owned();
    }
    if cleaned.len() == 9 && cleaned.starts_with('9') {
        return Some(cleaned);
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
    Some(ruc[2..10].to_owned())
}

#[cfg(test)]
mod tests {
    use super::{derive_dni_from_natural_ruc, normalize_phone};

    #[test]
    fn normalizes_phone_without_country_code_storage() {
        assert_eq!(normalize_phone("51987111222"), Some("987111222".to_owned()));
        assert_eq!(normalize_phone("987111222"), Some("987111222".to_owned()));
        assert_eq!(normalize_phone("123"), None);
    }

    #[test]
    fn derives_dni_from_natural_ruc() {
        assert_eq!(
            derive_dni_from_natural_ruc("10123456789"),
            Some("12345678".to_owned())
        );
        assert_eq!(derive_dni_from_natural_ruc("20123456789"), None);
    }
}
