use std::collections::HashSet;

use super::doc::digits;

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

/// Deduplicates and normalizes a list of raw phone strings extracted from a record.
/// Returns `(valid_phones, invalid_reasons)`.
pub(super) fn normalize_phones(raw_values: Vec<String>) -> (Vec<String>, Vec<String>) {
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
    (phones, reason_list)
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
    let d = digits(value);
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
