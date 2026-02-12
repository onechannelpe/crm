use crate::{error::{Error, Result}, service::types::Contact};
use std::fs::File;

pub async fn load_csv(path: &str) -> Result<Vec<Contact>> {
    tracing::info!("loading contacts from {}", path);

    let file = File::open(path).map_err(|e| Error::Data(format!("cannot open {}: {}", path, e)))?;

    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .from_reader(file);

    let mut contacts = Vec::new();

    for result in reader.records() {
        let record = result.map_err(|e| Error::Data(format!("csv parse error: {}", e)))?;

        if record.len() < 2 {
            continue;
        }

        let dni = get_field(&record, 0);
        let name = get_field(&record, 1);

        if !dni.is_empty() && !name.is_empty() {
            contacts.push(Contact {
                id: contacts.len(),
                dni,
                name,
                phone_primary: get_optional(&record, 2),
                phone_secondary: get_optional(&record, 3),
                org_ruc: get_optional(&record, 4),
                org_name: get_optional(&record, 5),
            });
        }
    }

    tracing::info!("loaded {} contacts", contacts.len());
    Ok(contacts)
}

fn get_field(record: &csv::StringRecord, index: usize) -> String {
    record.get(index).unwrap_or("").trim().to_string()
}

fn get_optional(record: &csv::StringRecord, index: usize) -> Option<String> {
    record
        .get(index)
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}
