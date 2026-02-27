use crate::PipelineError;
use crate::config::manifest::verify_manifest;
use crate::config::mapping::SourceMapping;
use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;

#[derive(Debug, Deserialize)]
struct CanonicalContract {
    fields: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct SourceContract {
    sources: Vec<SourceContractEntry>,
}

#[derive(Debug, Deserialize)]
struct SourceContractEntry {
    source_key: String,
    required_canonical_fields: Vec<String>,
    #[serde(default)]
    requires_any_phone_input: bool,
}

#[derive(Debug, Deserialize)]
struct ProjectionContract {
    projection: String,
    fields: Vec<ProjectionField>,
}

#[derive(Debug, Deserialize)]
struct ProjectionField {
    path: String,
    canonical_fields: Vec<String>,
}

pub fn validate_contracts(manifest_path: &str) -> Result<(), PipelineError> {
    let contracts_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../contracts");
    let canonical: CanonicalContract = load_json(&contracts_dir.join("canonical-contract.json"))?;
    let source_contract: SourceContract = load_json(&contracts_dir.join("source-contract.json"))?;
    let projection: ProjectionContract = load_json(&contracts_dir.join("search-projection.json"))?;

    if projection.projection.trim().is_empty() {
        return Err(PipelineError::Args(
            "search-projection contract requires a non-empty projection name".into(),
        ));
    }

    let canonical_fields = canonical.fields.into_iter().collect::<HashSet<_>>();
    let source_contract_by_key = source_contract
        .sources
        .into_iter()
        .map(|entry| (entry.source_key.clone(), entry))
        .collect::<HashMap<_, _>>();

    let manifest = verify_manifest(manifest_path)?;
    let enabled_sources = manifest.sources.into_iter().filter(|source| source.enabled);

    let mut mapped_by_enabled = HashSet::<String>::new();

    for source in enabled_sources {
        let Some(contract_entry) = source_contract_by_key.get(&source.source_key) else {
            return Err(PipelineError::Args(format!(
                "missing source contract entry for enabled source: {}",
                source.source_key
            )));
        };

        let mapping = SourceMapping::from_path(&source.mapping_path)?;

        for (key, mapped) in &mapping.fields {
            if !canonical_fields.contains(key) {
                return Err(PipelineError::Args(format!(
                    "mapping {} uses non-canonical field key: {}",
                    source.mapping_path, key
                )));
            }
            if !mapped.trim().is_empty() {
                mapped_by_enabled.insert(key.clone());
            }
        }

        for required in &contract_entry.required_canonical_fields {
            if !canonical_fields.contains(required) {
                return Err(PipelineError::Args(format!(
                    "source contract {} requires unknown canonical field: {}",
                    source.source_key, required
                )));
            }

            let exists = mapping
                .fields
                .get(required)
                .map(|value| !value.trim().is_empty())
                .unwrap_or(false);
            if !exists {
                return Err(PipelineError::Args(format!(
                    "source {} is missing required mapping field: {}",
                    source.source_key, required
                )));
            }
        }

        if contract_entry.requires_any_phone_input {
            let has_phone_mapping = mapping
                .fields
                .get("phone")
                .map(|value| !value.trim().is_empty())
                .unwrap_or(false)
                || !mapping.phone_columns.is_empty()
                || !mapping.phone_prefixes.is_empty();

            if !has_phone_mapping {
                return Err(PipelineError::Args(format!(
                    "source {} requires phone input but has no phone field/columns/prefixes",
                    source.source_key
                )));
            }

            mapped_by_enabled.insert("phone".to_string());
        }
    }

    let mut seen_projection_paths = HashSet::<String>::new();
    for field in projection.fields {
        if field.canonical_fields.is_empty() {
            return Err(PipelineError::Args(format!(
                "projection field {} has empty canonical_fields",
                field.path
            )));
        }
        if !seen_projection_paths.insert(field.path.clone()) {
            return Err(PipelineError::Args(format!(
                "projection contract has duplicate path: {}",
                field.path
            )));
        }

        for canonical in field.canonical_fields {
            if !canonical_fields.contains(&canonical) {
                return Err(PipelineError::Args(format!(
                    "projection field {} references unknown canonical field: {}",
                    field.path, canonical
                )));
            }
            if !mapped_by_enabled.contains(&canonical) {
                return Err(PipelineError::Args(format!(
                    "projection field {} is not backed by enabled source mappings: {}",
                    field.path, canonical
                )));
            }
        }
    }

    Ok(())
}

fn load_json<T: for<'de> Deserialize<'de>>(path: &Path) -> Result<T, PipelineError> {
    let raw = fs::read_to_string(path)?;
    serde_json::from_str::<T>(&raw).map_err(PipelineError::from)
}
