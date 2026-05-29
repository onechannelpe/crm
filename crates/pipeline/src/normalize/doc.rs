// Document identity: validation and normalization rules.
// No source knowledge lives here, by the time these functions are called,
// the doc type is already in canonical vocabulary (Stage 2 has applied any
// source-specific translation).

pub fn digits(value: &str) -> String {
    value.chars().filter(char::is_ascii_digit).collect()
}

pub fn normalize_dni(value: &str) -> Option<String> {
    let cleaned = digits(value);
    (cleaned.len() == 8).then_some(cleaned)
}

pub fn normalize_ruc(value: &str) -> Option<String> {
    let cleaned = digits(value);
    (cleaned.len() == 11).then_some(cleaned)
}

pub fn derive_dni_from_natural_ruc(ruc: &str) -> Option<String> {
    if ruc.len() == 11 && ruc.starts_with("10") {
        return Some(ruc[2..10].to_owned());
    }
    None
}

/// Validates and normalizes a `(doc_type, doc_number)` pair from sources that carry
/// explicit separate columns for type and number.
///
/// Sources: consolidado_ruc_representantes_ok, consolidado_ruc_representantes_bppo,
///          representantes_enriquecido, claro_post_202508, bitel_post_ms_2025 (disabled),
///          movistar_post_202508 (disabled), mov_me_sal_2025 (disabled).
///
/// Called from: `build_normalized` in mod.rs via the `rep_doc_type` / `rep_doc_number`
/// fields of `FieldValues`.
///
/// `raw_type` must be in canonical vocabulary (DNI, CE, PTP, CSR, CIRE). Sources that
/// use different encodings (Bitel "01"/"02", Movistar "C") must be translated via
/// `SourceMapping::doc_type_map` before reaching this function (Stage 2, translate.rs).
pub fn normalize_doc(raw_type: &str, raw_number: &str) -> Option<(String, String)> {
    let canonical_type = resolve_doc_type(raw_type.trim())?;
    let canonical_number = match canonical_type {
        "DNI" => collect_valid(raw_number.trim(), u8::is_ascii_digit, 8, 8),
        "CE" => collect_valid(raw_number.trim(), u8::is_ascii_alphanumeric, 4, 11),
        "PTP" => collect_valid(raw_number.trim(), u8::is_ascii_digit, 9, 9),
        "CSR" => collect_valid(raw_number.trim(), u8::is_ascii_digit, 5, 9),
        "CIRE" => collect_valid(raw_number.trim(), u8::is_ascii_alphanumeric, 4, 9),
        _ => unreachable!(),
    }?;
    Some((canonical_type.to_owned(), canonical_number))
}

fn resolve_doc_type(raw: &str) -> Option<&'static str> {
    match raw.to_ascii_uppercase().as_str() {
        "DNI" => Some("DNI"),
        "CE" | "C.E." | "CARNET DE EXTRANJERIA" | "CARNET EXTRANJERIA" => Some("CE"),
        "PTP" => Some("PTP"),
        "C.S.R." | "CARNET DE REFUGIO" | "CARNET SOLICITUD REFUGIO" => Some("CSR"),
        "C.I.R.E." | "CARNET IDENTIDAD" | "CARNET DE IDENTIDAD" => Some("CIRE"),
        _ => None,
    }
}

pub fn collect_valid(
    value: &str,
    valid: fn(&u8) -> bool,
    min: usize,
    max: usize,
) -> Option<String> {
    let mut out = String::with_capacity(max.min(value.len()));
    for b in value.bytes() {
        if valid(&b) {
            out.push(b.to_ascii_uppercase() as char);
            if out.len() > max {
                return None;
            }
        }
    }
    (out.len() >= min).then_some(out)
}

/// Interprets a value from a DNI-only column where the type is always implicit.
///
/// Sources: osiptel_2025 (column 0, `person_dni`).
///
/// Called from: `build_normalized` in mod.rs via the `person_dni` field of `FieldValues`.
///
/// Also handles the RENIEC natural-person RUC convention: an 11-digit RUC starting
/// with "10" encodes the holder's 8-digit DNI in digits 2-9.
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

/// Heuristically classifies a single document column with no accompanying type field.
///
/// Sources: celulares (column `DOCUMENTO`).
///
/// Called from: `build_normalized` in mod.rs via the `person_or_company_doc` field of
/// `FieldValues`.
///
/// Disambiguation rules (applied in order):
/// - 8 digits -> DNI
/// - 11 digits starting "10" -> natural-person RUC; DNI derived from digits 2-9
/// - 11 digits -> company RUC
/// - anything else -> unresolvable; all three return values are None
///
/// CE numbers in this source are unrecoverable: no type column exists to distinguish
/// a 9-digit CE number from an invalid value.
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cire_accepts_alphanumeric() {
        assert!(normalize_doc("C.I.R.E.", "ABC123").is_some());
        assert!(normalize_doc("CARNET IDENTIDAD", "A1B2C3").is_some());
    }

    #[test]
    fn cire_rejects_too_long() {
        assert!(normalize_doc("C.I.R.E.", "1234567890").is_none());
    }

    #[test]
    fn cire_rejects_too_short() {
        assert!(normalize_doc("C.I.R.E.", "AB").is_none());
    }

    #[test]
    fn ce_accepts_alphanumeric_in_range() {
        assert!(normalize_doc("CE", "002739616").is_some());
        assert!(normalize_doc("C.E.", "N114380").is_some());
    }

    #[test]
    fn ce_rejects_too_short() {
        assert!(normalize_doc("CE", "AB").is_none());
    }

    #[test]
    fn pasaporte_and_die_are_rejected() {
        assert!(normalize_doc("PASAPORTE", "AB123456").is_none());
        assert!(normalize_doc("D.I.E.", "AB123456").is_none());
    }
}
