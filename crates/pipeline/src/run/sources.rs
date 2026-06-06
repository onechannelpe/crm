use crate::PipelineError;
use crate::config::manifest::{SourceManifest, SourceManifestEntry, verify_manifest};

pub(super) fn load_enabled_sources(
    manifest_path: &str,
) -> Result<Vec<SourceManifestEntry>, PipelineError> {
    let SourceManifest { mut sources, .. } = verify_manifest(manifest_path)?;
    sources.retain(|source| source.enabled);
    sources.sort_by(|a, b| {
        b.priority
            .cmp(&a.priority)
            .then_with(|| a.source_key.cmp(&b.source_key))
    });
    Ok(sources)
}
