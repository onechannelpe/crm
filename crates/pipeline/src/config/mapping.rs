use crate::PipelineError;
use csv::{ByteRecord, Reader, ReaderBuilder, StringRecord};
use encoding_rs::WINDOWS_1252;
use serde::Deserialize;
use std::collections::HashMap;
use std::fs;
use std::fs::File;

#[derive(Debug, Clone, Copy, Deserialize)]
pub enum SourceEncoding {
    #[serde(rename = "auto")]
    Auto,

    #[serde(rename = "utf-8", alias = "utf8")]
    Utf8,

    #[serde(
        rename = "windows-1252",
        alias = "cp1252",
        alias = "iso-8859-1",
        alias = "latin1",
        alias = "latin-1"
    )]
    Windows1252,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SourceMapping {
    pub source_key: String,
    pub source_name: String,
    pub reliability_rank: i64,
    pub delimiter: String,

    #[serde(default = "default_true")]
    pub has_header: bool,

    #[serde(default)]
    pub flexible: bool,

    #[serde(default)]
    pub fields: HashMap<String, String>,

    #[serde(default)]
    pub phone_columns: Vec<String>,

    #[serde(default)]
    pub phone_prefixes: Vec<String>,

    #[serde(default = "default_source_encoding")]
    pub encoding: SourceEncoding,

    #[serde(default)]
    pub doc_type_map: HashMap<String, String>,
}

fn default_true() -> bool {
    true
}

fn default_source_encoding() -> SourceEncoding {
    SourceEncoding::Auto
}

impl SourceMapping {
    pub fn from_path(path: &str) -> Result<Self, PipelineError> {
        let raw = fs::read_to_string(path)?;

        Self::from_json(&raw)
    }

    pub fn from_json(raw: &str) -> Result<Self, PipelineError> {
        let mapping = serde_json::from_str::<Self>(raw)?;

        if mapping.delimiter.len() != 1 {
            return Err(PipelineError::Args(
                "mapping delimiter must be a single byte".to_owned(),
            ));
        }

        Ok(mapping)
    }

    pub fn delimiter_byte(&self) -> u8 {
        self.delimiter.as_bytes()[0]
    }

    pub fn reader(&self, path: &str) -> Result<Reader<File>, PipelineError> {
        Ok(ReaderBuilder::new()
            .delimiter(self.delimiter_byte())
            .has_headers(self.has_header)
            .flexible(self.flexible)
            .from_path(path)?)
    }

    pub fn decode_byte_record(&self, record: &ByteRecord) -> Result<StringRecord, PipelineError> {
        let mut fields = Vec::with_capacity(record.len());

        for field in record.iter() {
            fields.push(self.decode_field(field)?);
        }

        Ok(StringRecord::from(fields))
    }

    fn decode_field(&self, field: &[u8]) -> Result<String, PipelineError> {
        match self.encoding {
            SourceEncoding::Auto => {
                if let Ok(value) = std::str::from_utf8(field) {
                    return Ok(value.to_owned());
                }

                let (decoded, _, _) = WINDOWS_1252.decode(field);

                Ok(decoded.into_owned())
            }

            SourceEncoding::Utf8 => std::str::from_utf8(field).map(str::to_owned).map_err(|_| {
                PipelineError::Args(format!(
                    "invalid utf-8 for source '{}' while encoding='utf-8'",
                    self.source_key
                ))
            }),

            SourceEncoding::Windows1252 => {
                let (decoded, _, _) = WINDOWS_1252.decode(field);

                Ok(decoded.into_owned())
            }
        }
    }
}
