use crm_pipeline::config::mapping::{SourceEncoding, SourceMapping};
use crm_pipeline::normalize::{normalize_row, resolve_mapping};
use csv::StringRecord;
use std::collections::HashMap;

fn resolved_with_fields(fields: HashMap<String, &str>) -> crm_pipeline::normalize::ResolvedMapping {
    let mapping = SourceMapping {
        source_key: "test".to_owned(),
        source_name: "test".to_owned(),
        delimiter: ",".to_owned(),
        has_header: true,
        flexible: true,
        fields: fields
            .into_iter()
            .map(|(k, v)| (k, v.to_owned()))
            .collect::<HashMap<_, _>>(),
        phone_columns: Vec::new(),
        phone_prefixes: Vec::new(),
        encoding: SourceEncoding::Utf8,
        doc_type_map: HashMap::new(),
    };
    let headers = StringRecord::from(vec![
        "col0",
        "col1",
        "col2",
        "col3",
        "rep_doc_type",
        "rep_doc_number",
    ]);
    resolve_mapping(&mapping, Some(&headers)).expect("resolve mapping")
}

#[test]
fn location_fields_treat_no_disponible_as_missing() {
    let fields = HashMap::from([
        ("company_ubigeo".to_owned(), "col0"),
        ("company_department".to_owned(), "col1"),
        ("company_province".to_owned(), "col2"),
        ("company_district".to_owned(), "col3"),
    ]);
    let resolved = resolved_with_fields(fields);
    let record = StringRecord::from(vec![
        "NO DISPONIBLE",
        " no disponible ",
        "NO DISPONIBLE",
        "NO DISPONIBLE",
    ]);
    let row = normalize_row(&resolved, &record);
    assert_eq!(row.company_ubigeo, "");
    assert_eq!(row.company_department, "");
    assert_eq!(row.company_province, "");
    assert_eq!(row.company_district, "");
}

#[test]
fn location_fields_strips_whitespace_from_valid_values() {
    let fields = HashMap::from([
        ("company_ubigeo".to_owned(), "col0"),
        ("company_department".to_owned(), "col1"),
    ]);
    let resolved = resolved_with_fields(fields);
    let record = StringRecord::from(vec!["  150101  ", "  LIMA  "]);
    let row = normalize_row(&resolved, &record);
    assert_eq!(row.company_ubigeo, "150101");
    assert_eq!(row.company_department, "LIMA");
}

#[test]
fn location_fields_keep_valid_values() {
    let fields = HashMap::from([
        ("company_ubigeo".to_owned(), "col0"),
        ("company_department".to_owned(), "col1"),
        ("company_province".to_owned(), "col2"),
        ("company_district".to_owned(), "col3"),
    ]);
    let resolved = resolved_with_fields(fields);
    let record = StringRecord::from(vec!["150101", "LIMA", "LIMA", "LIMA"]);
    let row = normalize_row(&resolved, &record);
    assert_eq!(row.company_ubigeo, "150101");
    assert_eq!(row.company_department, "LIMA");
    assert_eq!(row.company_province, "LIMA");
    assert_eq!(row.company_district, "LIMA");
}

#[test]
fn doc_type_map_translates_before_normalize() {
    let mut doc_type_map = HashMap::new();
    doc_type_map.insert("01".to_owned(), "DNI".to_owned());
    let mapping = SourceMapping {
        source_key: "test".to_owned(),
        source_name: "test".to_owned(),
        delimiter: ",".to_owned(),
        has_header: true,
        flexible: true,
        fields: HashMap::from([
            ("rep_doc_type".to_owned(), "rep_doc_type".to_owned()),
            ("rep_doc_number".to_owned(), "rep_doc_number".to_owned()),
        ]),
        phone_columns: Vec::new(),
        phone_prefixes: Vec::new(),
        encoding: SourceEncoding::Utf8,
        doc_type_map,
    };
    let headers = StringRecord::from(vec!["rep_doc_type", "rep_doc_number"]);
    let resolved = resolve_mapping(&mapping, Some(&headers)).expect("resolve mapping");
    let record = StringRecord::from(vec!["01", "12345678"]);
    let row = normalize_row(&resolved, &record);
    assert_eq!(row.rep_doc_type, "DNI");
    assert_eq!(row.rep_doc_number, "12345678");
}
