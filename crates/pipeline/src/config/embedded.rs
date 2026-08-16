//! Source mappings embedded in the engine binary.
//!
//! The CLI can load mappings from `pipeline.toml`, but the engine ships as a
//! single binary with no mapping directory. Embedding keeps the accepted source
//! set fixed at compile time.

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
    use std::collections::BTreeSet;
    use std::fs;

    use super::*;

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

    // A mapping present on disk but missing here would be unavailable to the engine.
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
