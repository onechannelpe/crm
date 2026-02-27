/**
 * A mount maps one subdirectory of a remote git repo to a local path.
 * A single SourceConfig can have multiple mounts, all fetched in one
 * sparse checkout to avoid redundant network round-trips.
 */
export interface Mount {
  /** Path within the git repo to fetch (used for sparse-checkout). */
  repoPath: string;
  /** Local destination, relative to workspace root (convention: .refs/<name>). */
  localPath: string;
}

/**
 * When set on a SourceConfig, after fetching the tool will build a compact
 * file-tree index of the first mount and inject it between the given markers
 * in AGENTS.md. Useful for documentation sources where the AI benefits from
 * knowing what files exist.
 */
export interface IndexConfig {
  markerStart: string;
  markerEnd: string;
  /** Keep only the returned subset of files in the generated index. */
  filter?: (files: SourceFile[]) => SourceFile[];
}

export interface SourceConfig {
  name: string;
  repo: string;
  /** Branch to pull. Defaults to "main". */
  branch?: string;
  /** One or more repo-subdirectory → local-folder mappings. */
  mounts: Mount[];
  /** If present, build a compact index and inject it into AGENTS.md. */
  index?: IndexConfig;
}

// ---------------------------------------------------------------------------
// Internal types used by index-builder
// ---------------------------------------------------------------------------

export interface SourceFile {
  relativePath: string;
  category?: string;
  name: string;
}

export interface SourceSection {
  directory: string;
  files: string[];
}
