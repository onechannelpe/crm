//! Source mappings compiled into the binary.
//!
//! The offline CLI resolves mappings through `pipeline.toml` paths, because
//! operators edit the JSON and re-run. The engine cannot: `Dockerfile.engine`
//! ships a single binary and no data directory, so a path-based lookup would
//! fail at runtime inside the container. Embedding also makes the set of
//! sources the engine will accept a compile-time fact rather than whatever
//! happens to be on disk.
//!
//! Authorization for *who* may ingest a given source is the web layer's
//! concern. This registry only decides which source keys are resolvable.

use crate::PipelineError;
use crate::config::mapping::SourceMapping;

const MAPPINGS: &[(&str, &str)] = &[
    (
        "bitel_post_ms_2025",
        include_str!("../../data/mappings/sources/bitel_post_ms_2025.json"),
    ),
    (
        "celulares",
        include_str!("../../data/mappings/sources/celulares.json"),
    ),
    (
        "claro_post_202508",
        include_str!("../../data/mappings/sources/claro_post_202508.json"),
    ),
    (
        "consolidado_ruc_representantes_bppo",
        include_str!("../../data/mappings/sources/consolidado_ruc_representantes_bppo.json"),
    ),
    (
        "consolidado_ruc_representantes_ok",
        include_str!("../../data/mappings/sources/consolidado_ruc_representantes_ok.json"),
    ),
    (
        "mov_me_sal_2025",
        include_str!("../../data/mappings/sources/mov_me_sal_2025.json"),
    ),
    (
        "movistar_post_202508",
        include_str!("../../data/mappings/sources/movistar_post_202508.json"),
    ),
    // Keyed by the mapping's own source_key, which for this one source does not
    // match its file name (osiptel_2025.json declares source_key "osiptel").
    (
        "osiptel",
        include_str!("../../data/mappings/sources/osiptel_2025.json"),
    ),
    // Maps the 11-digit `doc` column to person_dni, not the 8-digit `num_doc`.
    // person_dni runs through normalize_person_document_with_natural_ruc, which
    // splits a "10"-prefixed RUC into both the DNI and natural_ruc10. Mapping
    // num_doc instead would yield the same DNI and silently drop the RUC10,
    // which is the field this source exists to contribute.
    (
        "osiptel_scan_sunat",
        include_str!("../../data/mappings/sources/osiptel_scan_sunat.json"),
    ),
    (
        "padron_ruc_202601",
        include_str!("../../data/mappings/sources/padron_ruc_202601.json"),
    ),
    (
        "representantes_enriquecido",
        include_str!("../../data/mappings/sources/representantes_enriquecido.json"),
    ),
];

/// Source keys this binary can ingest, in registry order.
pub fn source_keys() -> impl Iterator<Item = &'static str> {
    MAPPINGS.iter().map(|(key, _)| *key)
}

/// Resolves a mapping by source key. Returns `Args` for an unknown key so the
/// caller can turn it into a client-facing validation error rather than a 500.
pub fn mapping_for(source_key: &str) -> Result<SourceMapping, PipelineError> {
    let Some((_, raw)) = MAPPINGS.iter().find(|(key, _)| *key == source_key) else {
        return Err(PipelineError::Args(format!(
            "unknown source_key: {source_key}"
        )));
    };
    SourceMapping::from_json(raw)
}

/// (source_key, source_name) for every mapping this binary can ingest, in
/// registry order. Backs the engine's `/ingest-sources` endpoint so a
/// frontend source picker can never drift from what the engine will actually
/// accept, unlike a hand-maintained list on the caller's side.
pub fn list_sources() -> Vec<(String, String)> {
    source_keys()
        .map(|key| {
            let mapping = mapping_for(key).unwrap_or_else(|err| panic!("mapping {key}: {err}"));
            (key.to_owned(), mapping.source_name)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeSet;
    use std::fs;

    #[test]
    fn every_embedded_mapping_parses_and_matches_its_registry_key() {
        for key in source_keys() {
            let mapping = mapping_for(key).unwrap_or_else(|err| panic!("mapping {key}: {err}"));
            assert_eq!(
                mapping.source_key, key,
                "registry key must equal the mapping's own source_key"
            );
        }
    }

    // A mapping file on disk that nobody embedded is invisible to the engine,
    // and the failure would only show up as an unknown source_key in production.
    // Compared by declared source_key, not file name: osiptel_2025.json declares
    // "osiptel", and the key is what the API and source_registry use.
    #[test]
    fn registry_covers_every_mapping_file_on_disk() {
        let dir = concat!(env!("CARGO_MANIFEST_DIR"), "/data/mappings/sources");
        let on_disk: BTreeSet<String> = fs::read_dir(dir)
            .expect("mappings dir")
            .map(|entry| entry.expect("dir entry").path())
            .filter(|path| path.extension().is_some_and(|ext| ext == "json"))
            .map(|path| {
                let raw = fs::read_to_string(&path).expect("mapping file");
                SourceMapping::from_json(&raw)
                    .unwrap_or_else(|err| panic!("mapping {}: {err}", path.display()))
                    .source_key
            })
            .collect();
        let embedded: BTreeSet<String> = source_keys().map(str::to_owned).collect();

        assert_eq!(embedded, on_disk);
    }

    #[test]
    fn unknown_source_key_is_an_args_error() {
        let err = mapping_for("not_a_source").expect_err("unknown key must not resolve");
        assert!(err.to_string().contains("not_a_source"));
    }
}
