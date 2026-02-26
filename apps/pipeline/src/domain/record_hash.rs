use csv::StringRecord;
use sha2::{Digest, Sha256};

pub fn hash_record(record: &StringRecord, delimiter: &str) -> String {
    let joined = record.iter().collect::<Vec<_>>().join(delimiter);
    let mut hasher = Sha256::new();
    hasher.update(joined.as_bytes());
    hex::encode(hasher.finalize())
}
