use std::collections::HashMap;

use super::FieldValues;

/// Applies source-specific vocabulary translations to extracted field values.
/// Currently only translates `rep_doc_type` via the per-source `doc_type_map`.
///
/// A source that uses "01" for DNI declares `"doc_type_map": {"01": "DNI"}` in its
/// JSON mapping. After this stage, `rep_doc_type` is in canonical vocabulary and
/// Stage 3 (normalize) has no awareness of the original source encoding.
pub(super) fn apply(mut raw: FieldValues, doc_type_map: &HashMap<String, String>) -> FieldValues {
    if !doc_type_map.is_empty() && !raw.rep_doc_type.is_empty() {
        let key = raw.rep_doc_type.to_ascii_uppercase();
        if let Some(canonical) = doc_type_map.get(&key) {
            raw.rep_doc_type = canonical.clone();
        }
    }
    raw
}

#[cfg(test)]
mod tests {
    use super::*;

    fn empty_fields() -> FieldValues {
        FieldValues {
            person_dni: String::new(),
            person_or_company_doc: String::new(),
            rep_doc_type: String::new(),
            rep_doc_number: String::new(),
            person_full_name: String::new(),
            rep_name: String::new(),
            company_ruc: String::new(),
            company_name: String::new(),
            role_name: String::new(),
            role_start_date: String::new(),
            email: String::new(),
            phones_raw: Vec::new(),
            had_phone_input: false,
            company_status: String::new(),
            company_condition: String::new(),
            company_type: String::new(),
            economic_activity: String::new(),
            company_ubigeo: String::new(),
            company_department: String::new(),
            company_province: String::new(),
            company_district: String::new(),
        }
    }

    #[test]
    fn translates_rep_doc_type_when_map_matches() {
        let map = HashMap::from([("01".to_owned(), "DNI".to_owned())]);
        let raw = FieldValues {
            rep_doc_type: "01".to_owned(),
            ..empty_fields()
        };
        let result = apply(raw, &map);
        assert_eq!(result.rep_doc_type, "DNI");
    }

    #[test]
    fn leaves_type_unchanged_when_not_in_map() {
        let map = HashMap::from([("01".to_owned(), "DNI".to_owned())]);
        let raw = FieldValues {
            rep_doc_type: "DNI".to_owned(),
            ..empty_fields()
        };
        let result = apply(raw, &map);
        assert_eq!(result.rep_doc_type, "DNI");
    }

    #[test]
    fn translates_rep_doc_type_case_insensitively() {
        let map = HashMap::from([("C".to_owned(), "CE".to_owned())]);
        let raw = FieldValues {
            rep_doc_type: "c".to_owned(),
            ..empty_fields()
        };
        let result = apply(raw, &map);
        assert_eq!(result.rep_doc_type, "CE");
    }

    #[test]
    fn skips_translation_when_map_is_empty() {
        let map = HashMap::new();
        let raw = FieldValues {
            rep_doc_type: "01".to_owned(),
            ..empty_fields()
        };
        let result = apply(raw, &map);
        assert_eq!(result.rep_doc_type, "01");
    }
}
