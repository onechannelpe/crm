use proptest::prelude::*;
use search_service::domain::{validate_dni, validate_ruc};

proptest! {
    #[test]
    fn validate_ruc_accepts_exactly_11_ascii_digits(s in "[0-9]{11}") {
        prop_assert!(validate_ruc(&s).is_ok());
    }

    #[test]
    fn validate_ruc_rejects_non_11_digit_strings(
        s in prop_oneof![
            // too short
            "[0-9]{0,10}",
            // too long
            "[0-9]{12,20}",
            // right length but non-digit chars
            "[0-9]{10}[a-z]",
        ]
    ) {
        prop_assert!(validate_ruc(&s).is_err());
    }

    #[test]
    fn validate_dni_accepts_8_to_12_ascii_digits(s in "[0-9]{8,12}") {
        prop_assert!(validate_dni(&s).is_ok());
    }

    #[test]
    fn validate_dni_rejects_strings_outside_8_to_12_digits(
        s in prop_oneof![
            // too short
            "[0-9]{0,7}",
            // too long
            "[0-9]{13,20}",
            // right length but non-digit chars
            "[0-9]{7}[a-z]",
        ]
    ) {
        prop_assert!(validate_dni(&s).is_err());
    }
}
