use crate::error::StartupError;
use crate::types::Record;
use memmap2::MmapOptions;
use std::collections::HashMap;
use std::fs::File;
use std::sync::Arc;

struct HeaderIndexes {
    dni: Option<usize>,
    ruc: Option<usize>,
    name: Option<usize>,
    phones: Option<usize>,
    phone_primary: Option<usize>,
    phone_secondary: Option<usize>,
    org_name: Option<usize>,
}

impl HeaderIndexes {
    fn from_headers(headers: &HashMap<String, usize>) -> Self {
        Self {
            dni: index_from_aliases(headers, &["dni"]),
            ruc: index_from_aliases(headers, &["ruc", "org_ruc"]),
            name: index_from_aliases(headers, &["name", "nombre"]),
            phones: index_from_aliases(headers, &["phones"]),
            phone_primary: index_from_aliases(headers, &["phone_primary", "phone", "telefono"]),
            phone_secondary: index_from_aliases(
                headers,
                &["phone_secondary", "telefono_secundario"],
            ),
            org_name: index_from_aliases(headers, &["org_name", "company", "empresa"]),
        }
    }
}

pub fn load(path: &str) -> Result<Vec<Record>, StartupError> {
    tracing::info!("loading records from {}", path);

    let file =
        File::open(path).map_err(|e| StartupError::Csv(format!("cannot open {}: {}", path, e)))?;
    let estimated_rows = file
        .metadata()
        .ok()
        .map(|meta| (meta.len() / 40) as usize)
        .unwrap_or(0);

    let mut records = Vec::with_capacity(estimated_rows);
    // SAFETY: read-only mapping of an immutable file descriptor. We never write
    // through this mapping and only read bytes while `file` is still alive.
    let mmap = unsafe { MmapOptions::new().map(&file) }
        .map_err(|e| StartupError::Csv(format!("cannot mmap {}: {}", path, e)))?;

    let mut line_no = 0usize;
    let mut fields: Vec<&[u8]> = Vec::with_capacity(8);
    let mut header_indices: Option<HeaderIndexes> = None;

    for raw_line in mmap.split(|&b| b == b'\n') {
        line_no += 1;
        let line = trim_ascii(raw_line);
        if line.is_empty() {
            continue;
        }

        split_csv_line_no_quotes(line, &mut fields).map_err(|msg| {
            StartupError::Csv(format!("parse error at line {}: {}", line_no, msg))
        })?;

        if header_indices.is_none() {
            let headers = fields
                .iter()
                .enumerate()
                .map(|(idx, value)| {
                    normalize_bytes(value)
                        .map(|name| (name, idx))
                        .map_err(|e| StartupError::Csv(format!("header parse error: {}", e)))
                })
                .collect::<Result<HashMap<_, _>, _>>()?;
            header_indices = Some(HeaderIndexes::from_headers(&headers));
            continue;
        }

        let indices = header_indices
            .as_ref()
            .ok_or_else(|| StartupError::Csv("missing CSV headers".into()))?;

        let Some(dni) = field_from_index(&fields, indices.dni, line_no)? else {
            continue;
        };

        let ruc = field_from_index(&fields, indices.ruc, line_no)?;
        let name = field_from_index(&fields, indices.name, line_no)?;
        let (phone_primary, phone_secondary) = phones_from_fields(&fields, indices, line_no)?;
        let org_name = field_from_index(&fields, indices.org_name, line_no)?;

        records.push(Record {
            dni,
            name,
            phone_primary,
            phone_secondary,
            org_ruc: ruc,
            org_name,
        });
    }

    if header_indices.is_none() {
        return Err(StartupError::Csv("cannot read headers".into()));
    }

    tracing::info!("loaded {} records", records.len());
    Ok(records)
}

fn index_from_aliases(headers: &HashMap<String, usize>, aliases: &[&str]) -> Option<usize> {
    aliases
        .iter()
        .find_map(|alias| headers.get(*alias).copied())
}

fn normalize_bytes(value: &[u8]) -> Result<String, String> {
    let text = std::str::from_utf8(trim_ascii(value)).map_err(|e| e.to_string())?;
    Ok(text.to_lowercase())
}

fn field_from_index(
    fields: &[&[u8]],
    idx: Option<usize>,
    line_no: usize,
) -> Result<Option<Arc<str>>, StartupError> {
    let Some(raw) = idx.and_then(|i| fields.get(i).copied()) else {
        return Ok(None);
    };
    bytes_to_arc(raw, line_no)
}

fn phones_from_fields(
    fields: &[&[u8]],
    indices: &HeaderIndexes,
    line_no: usize,
) -> Result<(Option<Arc<str>>, Option<Arc<str>>), StartupError> {
    if let Some(raw) = indices.phones.and_then(|i| fields.get(i).copied()) {
        let mut primary: Option<Arc<str>> = None;
        let mut secondary: Option<Arc<str>> = None;
        for part in raw.split(|&b| b == b';') {
            if primary.is_none() {
                primary = bytes_to_arc(part, line_no)?;
            } else if secondary.is_none() {
                secondary = bytes_to_arc(part, line_no)?;
                break;
            }
        }
        return Ok((primary, secondary));
    }

    let primary = field_from_index(fields, indices.phone_primary, line_no)?;
    let secondary = field_from_index(fields, indices.phone_secondary, line_no)?;
    Ok((primary, secondary))
}

fn split_csv_line_no_quotes<'a>(line: &'a [u8], fields: &mut Vec<&'a [u8]>) -> Result<(), String> {
    // Intentional fast path for our production dataset shape.
    // If ingestion starts producing quoted fields, this should fail fast and
    // force either upstream cleanup or a parser upgrade.
    if line.contains(&b'"') {
        return Err("quoted CSV fields are not supported".into());
    }
    fields.clear();
    let mut start = 0usize;
    for (i, &b) in line.iter().enumerate() {
        if b == b',' {
            fields.push(&line[start..i]);
            start = i + 1;
        }
    }
    fields.push(&line[start..]);
    Ok(())
}

fn trim_ascii(bytes: &[u8]) -> &[u8] {
    let mut start = 0usize;
    let mut end = bytes.len();
    while start < end && bytes[start].is_ascii_whitespace() {
        start += 1;
    }
    while start < end && bytes[end - 1].is_ascii_whitespace() {
        end -= 1;
    }
    &bytes[start..end]
}

fn bytes_to_arc(bytes: &[u8], line_no: usize) -> Result<Option<Arc<str>>, StartupError> {
    let trimmed = trim_ascii(bytes);
    if trimmed.is_empty() {
        return Ok(None);
    }
    let value = std::str::from_utf8(trimmed)
        .map_err(|e| StartupError::Csv(format!("invalid utf-8 at line {}: {}", line_no, e)))?;
    Ok(Some(Arc::<str>::from(value)))
}
