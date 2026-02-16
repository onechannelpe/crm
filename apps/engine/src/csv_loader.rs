use crate::error::StartupError;
use crate::types::Record;
use std::collections::HashMap;
use std::fs::File;

pub fn load(path: &str) -> Result<Vec<Record>, StartupError> {
    tracing::info!("loading records from {}", path);

    let file =
        File::open(path).map_err(|e| StartupError::Csv(format!("cannot open {}: {}", path, e)))?;

    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .from_reader(file);
    let headers = reader
        .headers()
        .map_err(|e| StartupError::Csv(format!("cannot read headers: {}", e)))?
        .iter()
        .enumerate()
        .map(|(idx, value)| (normalize(value), idx))
        .collect::<HashMap<_, _>>();

    let mut records = Vec::new();

    for result in reader.records() {
        let row = result.map_err(|e| StartupError::Csv(format!("parse error: {}", e)))?;
        if row.is_empty() {
            continue;
        }

        let dni = field_from_aliases(&row, &headers, &["dni"]);
        if dni.is_empty() {
            continue;
        }

        let ruc = optional_field_from_aliases(&row, &headers, &["ruc", "org_ruc"]);
        let name = optional_field_from_aliases(&row, &headers, &["name", "nombre"])
            .unwrap_or_else(|| format!("Contacto {}", dni));
        let (phone_primary, phone_secondary) = phones_from_row(&row, &headers);
        let org_name =
            optional_field_from_aliases(&row, &headers, &["org_name", "company", "empresa"]);

        records.push(Record {
            dni,
            name,
            phone_primary,
            phone_secondary,
            org_ruc: ruc,
            org_name,
        });
    }

    tracing::info!("loaded {} records", records.len());
    Ok(records)
}

fn normalize(value: &str) -> String {
    value.trim().to_lowercase()
}

fn field_from_aliases(
    row: &csv::StringRecord,
    headers: &HashMap<String, usize>,
    aliases: &[&str],
) -> String {
    optional_field_from_aliases(row, headers, aliases).unwrap_or_default()
}

fn optional_field_from_aliases(
    row: &csv::StringRecord,
    headers: &HashMap<String, usize>,
    aliases: &[&str],
) -> Option<String> {
    aliases
        .iter()
        .find_map(|alias| headers.get(*alias).copied())
        .and_then(|idx| row.get(idx))
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

fn phones_from_row(
    row: &csv::StringRecord,
    headers: &HashMap<String, usize>,
) -> (Option<String>, Option<String>) {
    if let Some(combined) = optional_field_from_aliases(row, headers, &["phones"]) {
        let mut numbers = combined
            .split(';')
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToString::to_string)
            .collect::<Vec<_>>();
        let primary = numbers.first().cloned();
        let secondary = if numbers.len() > 1 {
            Some(numbers.remove(1))
        } else {
            None
        };
        return (primary, secondary);
    }

    let primary =
        optional_field_from_aliases(row, headers, &["phone_primary", "phone", "telefono"]);
    let secondary =
        optional_field_from_aliases(row, headers, &["phone_secondary", "telefono_secundario"]);
    (primary, secondary)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_csv_path(name: &str) -> String {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time")
            .as_nanos();
        std::env::temp_dir()
            .join(format!("{}-{}.csv", name, nonce))
            .to_string_lossy()
            .to_string()
    }

    #[test]
    fn loads_ruc_and_phones_from_current_dataset_shape() {
        let path = temp_csv_path("crm-engine-csv-loader");
        let csv = "dni,ruc,phones,operators,source\n12345678,20100047218,999111222;999111333,CLARO,seed\n";
        fs::write(&path, csv).expect("write csv");

        let records = load(&path).expect("load csv");
        fs::remove_file(&path).expect("remove csv");

        assert_eq!(records.len(), 1);
        let row = &records[0];
        assert_eq!(row.dni, "12345678");
        assert_eq!(row.org_ruc.as_deref(), Some("20100047218"));
        assert_eq!(row.phone_primary.as_deref(), Some("999111222"));
        assert_eq!(row.phone_secondary.as_deref(), Some("999111333"));
        assert_eq!(row.name, "Contacto 12345678");
    }
}
