use crate::PipelineError;
use crate::config::manifest::{SourceManifestEntry, verify_manifest};
use crate::config::mapping::SourceMapping;
use serde::Deserialize;
use std::collections::{HashMap, HashSet};

const CANONICAL_CONTRACT_JSON: &str = include_str!("../../../contracts/canonical-contract.json");
const SOURCE_CONTRACT_JSON: &str = include_str!("../../../contracts/source-contract.json");
const SEARCH_PROJECTION_JSON: &str = include_str!("../../../contracts/search-projection.json");

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
    let canonical: CanonicalContract =
        load_json_embedded(CANONICAL_CONTRACT_JSON, "canonical-contract.json")?;
    let source_contract: SourceContract =
        load_json_embedded(SOURCE_CONTRACT_JSON, "source-contract.json")?;
    let projection: ProjectionContract =
        load_json_embedded(SEARCH_PROJECTION_JSON, "search-projection.json")?;

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
    let enabled_sources: Vec<SourceManifestEntry> =
        manifest.sources.into_iter().filter(|s| s.enabled).collect();

    let mut errors: Vec<String> = Vec::new();

    let (source_errors, mapped_by_enabled) =
        validate_source_mappings(&enabled_sources, &canonical_fields, &source_contract_by_key);
    errors.extend(source_errors);

    let projection_errors =
        validate_projection_fields(&projection.fields, &canonical_fields, &mapped_by_enabled);
    errors.extend(projection_errors);

    if errors.is_empty() {
        Ok(())
    } else {
        Err(PipelineError::Args(errors.join("\n")))
    }
}

fn validate_source_mappings(
    enabled_sources: &[SourceManifestEntry],
    canonical_fields: &HashSet<String>,
    source_contract_by_key: &HashMap<String, SourceContractEntry>,
) -> (Vec<String>, HashSet<String>) {
    let mut errors = Vec::new();
    let mut mapped_by_enabled = HashSet::<String>::new();

    for source in enabled_sources {
        let Some(contract_entry) = source_contract_by_key.get(&source.source_key) else {
            errors.push(format!(
                "missing source contract entry for enabled source: {}",
                source.source_key
            ));
            continue;
        };

        let mapping = match SourceMapping::from_path(&source.mapping_path) {
            Ok(mapping) => mapping,
            Err(err) => {
                errors.push(format!(
                    "failed to load mapping {}: {err}",
                    source.mapping_path
                ));
                continue;
            }
        };

        for (key, mapped_value) in &mapping.fields {
            if !canonical_fields.contains(key) {
                errors.push(format!(
                    "mapping {} uses non-canonical field key: {key}",
                    source.mapping_path
                ));
                continue;
            }
            if !mapped_value.trim().is_empty() {
                mapped_by_enabled.insert(key.clone());
            }
        }

        for required in &contract_entry.required_canonical_fields {
            if !canonical_fields.contains(required) {
                errors.push(format!(
                    "source contract {} requires unknown canonical field: {required}",
                    source.source_key
                ));
                continue;
            }
            let exists = mapping
                .fields
                .get(required)
                .map(|value| !value.trim().is_empty())
                .unwrap_or(false);
            if !exists {
                errors.push(format!(
                    "source {} is missing required mapping field: {required}",
                    source.source_key
                ));
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
                errors.push(format!(
                    "source {} requires phone input but has no phone field/columns/prefixes",
                    source.source_key
                ));
            } else {
                mapped_by_enabled.insert("phone".to_string());
            }
        }
    }

    (errors, mapped_by_enabled)
}

fn validate_projection_fields(
    fields: &[ProjectionField],
    canonical_fields: &HashSet<String>,
    mapped_by_enabled: &HashSet<String>,
) -> Vec<String> {
    let mut errors = Vec::new();
    let mut seen_paths = HashSet::<String>::new();

    for field in fields {
        if field.canonical_fields.is_empty() {
            errors.push(format!(
                "projection field {} has empty canonical_fields",
                field.path
            ));
            continue;
        }
        if !seen_paths.insert(field.path.clone()) {
            errors.push(format!(
                "projection contract has duplicate path: {}",
                field.path
            ));
            continue;
        }

        for canonical in &field.canonical_fields {
            if !canonical_fields.contains(canonical) {
                errors.push(format!(
                    "projection field {} references unknown canonical field: {canonical}",
                    field.path
                ));
                continue;
            }
            if !mapped_by_enabled.contains(canonical) {
                errors.push(format!(
                    "projection field {} is not backed by enabled source mappings: {canonical}",
                    field.path
                ));
            }
        }
    }

    errors
}

fn load_json_embedded<T: for<'de> Deserialize<'de>>(
    raw: &str,
    label: &str,
) -> Result<T, PipelineError> {
    serde_json::from_str::<T>(raw).map_err(|error| {
        PipelineError::Args(format!("failed to parse embedded contract {}: {error}", label))
    })
}
