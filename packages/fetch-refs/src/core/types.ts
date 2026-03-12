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
 * file-tree index of the **first mount only** and inject it between the given
 * markers in AGENTS.md. Additional mounts are fetched but not indexed.
 * Useful for documentation sources where the AI benefits from knowing what files exist.
 */
export interface IndexConfig {
  markerStart: string;
  markerEnd: string;
  /** Keep only the returned subset of files in the generated index. */
  filter?: (files: SourceFileInfo[]) => SourceFileInfo[];
  /** Optional source-specific formatter for the injected AGENTS.md block. */
  compile?: (input: IndexBuildInput) => string | Promise<string>;
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

export interface SourceFileInfo {
  relativePath: string;
  category?: string;
  name: string;
}

export interface IndexBuildInput {
  localPath: string;
  sourceName: string;
  files: SourceFileInfo[];
}
