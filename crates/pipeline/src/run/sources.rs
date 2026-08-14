use crate::PipelineError;
use crate::config::manifest::{SourceManifest, SourceManifestEntry, verify_manifest};

pub(super) fn load_enabled_sources(
    manifest_path: &str,
) -> Result<Vec<SourceManifestEntry>, PipelineError> {
    let SourceManifest { mut sources, .. } = verify_manifest(manifest_path)?;
    sources.retain(|source| source.enabled);
    // Oldest snapshot first, newest last: fields with no explicit rank gate
    // (company.status/condition/... in merge_core.sql) resolve conflicts by
    // "last write wins", so processing order needs to track recency, not an
    // arbitrary priority number.
    sources.sort_by(|a, b| {
        a.snapshot_date
            .cmp(&b.snapshot_date)
            .then_with(|| a.source_key.cmp(&b.source_key))
    });
    Ok(sources)
}
