use crate::error::StartupError;
use crate::types::Record;
use std::fs::File;

pub fn load(path: &str) -> Result<Vec<Record>, StartupError> {
    tracing::info!("loading records from {}", path);

    let file =
        File::open(path).map_err(|e| StartupError::Csv(format!("cannot open {}: {}", path, e)))?;

    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .from_reader(file);

    let mut records = Vec::new();

    for result in reader.records() {
        let row =
            result.map_err(|e| StartupError::Csv(format!("parse error: {}", e)))?;

        if row.len() < 2 {
            continue;
        }

        let dni = field(&row, 0);
        let name = field(&row, 1);

        if !dni.is_empty() && !name.is_empty() {
            records.push(Record {
                dni,
                name,
                phone_primary: optional_field(&row, 2),
                phone_secondary: optional_field(&row, 3),
                org_ruc: optional_field(&row, 4),
                org_name: optional_field(&row, 5),
            });
        }
    }

    tracing::info!("loaded {} records", records.len());
    Ok(records)
}

fn field(row: &csv::StringRecord, i: usize) -> String {
    row.get(i).unwrap_or("").trim().to_string()
}

fn optional_field(row: &csv::StringRecord, i: usize) -> Option<String> {
    row.get(i)
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}
