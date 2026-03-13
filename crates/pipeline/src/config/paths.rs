use std::path::{Path, PathBuf};

pub fn default_raw_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("data/raw")
}

pub fn default_build_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("data/build/staged")
}

pub fn default_mapping_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("data/mappings/sources")
}

pub fn default_staged_db() -> PathBuf {
    default_build_dir().join("contacts.pipeline.staged.sqlite")
}

pub fn default_source_manifest() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("data/mappings/source-manifest.json")
}

pub fn default_normalized_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("data/normalized")
}

pub fn default_pipeline_config() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("pipeline.toml")
}
