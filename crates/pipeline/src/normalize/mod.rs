//! Source-independent row normalization.
//!
//! Extraction maps source columns into canonical fields, translation resolves
//! per-source vocabulary, and row building applies document, phone, and email
//! normalization rules.

mod doc;
mod email;
mod extract;
mod phone;
mod row;
mod translate;

pub use doc::{
    derive_dni_from_natural_ruc, normalize_ambiguous_doc,
    normalize_person_document_with_natural_ruc,
};
pub use extract::{ResolvedMapping, resolve_mapping};
pub use phone::{PhoneKind, normalize_phone_with_kind};
pub use row::NormalizedRow;

use csv::StringRecord;
use sha2::{Digest, Sha256};

pub fn normalize_row(resolved: &ResolvedMapping, record: &StringRecord) -> NormalizedRow {
    let raw = extract::extract_fields(resolved, record);
    let raw = translate::apply(raw, &resolved.doc_type_map);
    row::build(raw)
}

pub fn hash_record(record: &StringRecord, delimiter: &str) -> String {
    let mut hasher = Sha256::new();
    let mut iter = record.iter();
    if let Some(first) = iter.next() {
        hasher.update(first.as_bytes());
    }
    for field in iter {
        hasher.update(delimiter.as_bytes());
        hasher.update(field.as_bytes());
    }
    hex::encode(hasher.finalize())
}
