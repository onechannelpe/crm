use proptest::prelude::*;
use search::domain::{
    validate_document_number, validate_phone, validate_ruc, validate_text,
};

proptest! {
    // Document number

    #[test]
    fn doc_number_accepts_8_to_12_digits(s in "[0-9]{8,12}") {
        prop_assert!(validate_document_number(&s).is_ok());
    }

    #[test]
    fn doc_number_rejects_too_short(s in "[0-9]{0,7}") {
        prop_assert!(validate_document_number(&s).is_err());
    }

    #[test]
    fn doc_number_rejects_too_long(s in "[0-9]{13,20}") {
        prop_assert!(validate_document_number(&s).is_err());
    }

    #[test]
    fn doc_number_rejects_non_digits(s in "[0-9]{7}[a-z][0-9]{0,3}") {
        prop_assert!(validate_document_number(&s).is_err());
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
