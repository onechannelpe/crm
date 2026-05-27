use crm_pipeline::normalize::helpers::{
    PhoneKind, derive_dni_from_natural_ruc, normalize_ambiguous_doc,
    normalize_person_document_with_natural_ruc, normalize_phone_with_kind,
};

#[test]
fn normalizes_phone_without_country_code_storage() {
    assert_eq!(
        normalize_phone_with_kind("51987111222"),
        Some(("987111222".to_owned(), PhoneKind::Mobile))
    );
    assert_eq!(
        normalize_phone_with_kind("987111222"),
        Some(("987111222".to_owned(), PhoneKind::Mobile))
    );
    assert_eq!(normalize_phone_with_kind("123"), None);
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
    assert_eq!(
        normalize_person_document_with_natural_ruc("044179249"),
        (None, None)
    );
}

#[test]
fn normalizes_ambiguous_doc() {
    // 8-digit DNI
    assert_eq!(
        normalize_ambiguous_doc("12345678"),
        (Some("12345678".to_owned()), None, None)
    );
    // Natural-person RUC10 → derives DNI
    assert_eq!(
        normalize_ambiguous_doc("10441792498"),
        (
            Some("44179249".to_owned()),
            Some("10441792498".to_owned()),
            None
        )
    );
    // Company RUC20 → routes to company_ruc
    assert_eq!(
        normalize_ambiguous_doc("20601048061"),
        (None, None, Some("20601048061".to_owned()))
    );
    // Unresolvable → all None
    assert_eq!(normalize_ambiguous_doc("ABC123"), (None, None, None));
    assert_eq!(normalize_ambiguous_doc(""), (None, None, None));
}
