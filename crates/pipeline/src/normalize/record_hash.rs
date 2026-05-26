use csv::StringRecord;
use sha2::{Digest, Sha256};

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
