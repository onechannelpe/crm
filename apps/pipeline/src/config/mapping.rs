use crate::PipelineError;
use serde::Deserialize;
use std::collections::HashMap;
use std::fs;

#[derive(Debug, Deserialize)]
pub struct SourceMapping {
    pub source_key: String,
    pub source_name: String,
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
}

fn default_true() -> bool {
    true
}

impl SourceMapping {
    pub fn from_path(path: &str) -> Result<Self, PipelineError> {
        let raw = fs::read_to_string(path)?;
        let mapping = serde_json::from_str::<Self>(&raw)?;
        if mapping.delimiter.chars().count() != 1 {
            return Err(PipelineError::Args(
                "mapping delimiter must be a single character".to_owned(),
            ));
        }
        Ok(mapping)
    }

    pub fn delimiter_byte(&self) -> u8 {
        self.delimiter.as_bytes()[0]
    }
}
