use proptest::prelude::*;
use search::contracts::SearchIntent;
use search::domain::{plan_query, validate_phone, validate_ruc, validate_text};

proptest! {
    // Document queries via plan_query

    #[test]
    fn doc_query_dni_accepts_8_digits(s in "[0-9]{8}") {
        let query = format!("DNI:{s}");
        prop_assert!(plan_query(SearchIntent::People, &query).is_ok());
    }

    #[test]
    fn doc_query_dni_rejects_wrong_length(s in prop_oneof!["[0-9]{1,7}", "[0-9]{9,15}"]) {
        let query = format!("DNI:{s}");
        prop_assert!(plan_query(SearchIntent::People, &query).is_err());
    }

    #[test]
    fn doc_query_ce_accepts_4_to_11_alnum(s in "[A-Za-z0-9]{4,11}") {
        let query = format!("CE:{s}");
        prop_assert!(plan_query(SearchIntent::People, &query).is_ok());
    }

    #[test]
    fn doc_query_ce_rejects_short(s in "[A-Za-z0-9]{1,3}") {
        let query = format!("CE:{s}");
        prop_assert!(plan_query(SearchIntent::People, &query).is_err());
    }

    #[test]
    fn doc_query_ce_rejects_long(s in "[A-Za-z0-9]{12,20}") {
        let query = format!("CE:{s}");
        prop_assert!(plan_query(SearchIntent::People, &query).is_err());
    }

    #[test]
    fn doc_query_rejects_unsupported_types(s in "[0-9]{8}") {
        let passport_query = format!("PASAPORTE:{s}");
        prop_assert!(plan_query(SearchIntent::People, &passport_query).is_err());

        let die_query = format!("DIE:{s}");
        prop_assert!(plan_query(SearchIntent::People, &die_query).is_err());
    }

    // RUC

    #[test]
    fn ruc_accepts_exactly_11_digits(s in "[0-9]{11}") {
        prop_assert!(validate_ruc(&s).is_ok());
    }

    #[test]
    fn ruc_rejects_wrong_length(s in prop_oneof!["[0-9]{0,10}", "[0-9]{12,20}"]) {
        prop_assert!(validate_ruc(&s).is_err());
    }

    #[test]
    fn ruc_rejects_non_digits(s in "[0-9]{10}[a-z]") {
        prop_assert!(validate_ruc(&s).is_err());
    }

    // Phone

    #[test]
    fn phone_accepts_7_to_15_digits(s in "[0-9]{7,15}") {
        prop_assert!(validate_phone(&s).is_ok());
    }

    #[test]
    fn phone_rejects_too_short(s in "[0-9]{0,6}") {
        prop_assert!(validate_phone(&s).is_err());
    }

    #[test]
    fn phone_rejects_too_long(s in "[0-9]{16,25}") {
        prop_assert!(validate_phone(&s).is_err());
    }

    // Text

    #[test]
    fn text_accepts_query_with_long_enough_token(word in "[a-z]{3,20}") {
        prop_assert!(validate_text(&word).is_ok());
    }

    #[test]
    fn text_rejects_single_char_query(c in "[a-z]") {
        prop_assert!(validate_text(&c).is_err());
    }
}
