export interface DocFile {
  relativePath: string;
  category?: string;
  name: string;
}

export interface DocSection {
  directory: string;
  files: string[];
}

export interface FrameworkConfig {
  name: string;
  docsRoot: string;
  gitRepo: string;
  gitPaths: string[];
  agentSection: string;
  markerStart: string;
  markerEnd: string;
  transform?: (files: DocFile[]) => DocFile[];
}
