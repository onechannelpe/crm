use csv::ByteRecord;
use pipeline::config::mapping::{SourceEncoding, SourceMapping};
use std::collections::HashMap;

fn mapping_with_encoding(encoding: SourceEncoding) -> SourceMapping {
    SourceMapping {
        source_key: "test_source".to_owned(),
        source_name: "test_source".to_owned(),
        delimiter: ",".to_owned(),
        has_header: true,
        flexible: true,
        fields: HashMap::new(),
        phone_columns: Vec::new(),
        phone_prefixes: Vec::new(),
        encoding,
        doc_type_map: HashMap::new(),
    }
}

fn single_field_record(bytes: &[u8]) -> ByteRecord {
    let mut record = ByteRecord::new();
    record.push_field(bytes);
    record
}

#[test]
fn auto_decodes_windows_1252_when_utf8_is_invalid() {
    let mapping = mapping_with_encoding(SourceEncoding::Auto);
    let record = single_field_record(&[0x4E, 0x55, 0xD1, 0x4F, 0x41]);

    let decoded = mapping
        .decode_byte_record(&record)
        .expect("auto decoder should decode cp1252 text");

    assert_eq!(decoded.get(0), Some("NUÑOA"));
}

#[test]
fn utf8_mode_rejects_invalid_utf8_bytes() {
    let mapping = mapping_with_encoding(SourceEncoding::Utf8);
    let record = single_field_record(&[0xD1]);

    assert!(mapping.decode_byte_record(&record).is_err());
}

#[test]
fn windows_1252_mode_decodes_legacy_bytes() {
    let mapping = mapping_with_encoding(SourceEncoding::Windows1252);
    let record = single_field_record(&[0x43, 0x41, 0xD1, 0x45, 0x54, 0x45]);

    let decoded = mapping
        .decode_byte_record(&record)
        .expect("cp1252 decoder should decode");

    assert_eq!(decoded.get(0), Some("CAÑETE"));
}
