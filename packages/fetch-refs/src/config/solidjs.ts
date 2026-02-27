import type { SourceConfig } from "../core/types.ts";

export const solidjsConfig: SourceConfig = {
  name: "SolidJS",
  repo: "https://github.com/solidjs/solid-docs.git",
  mounts: [{ repoPath: "src/routes", localPath: ".refs/solidjs-docs" }],
  index: {
    markerStart: "<!-- SOLIDJS-DOCS-START -->",
    markerEnd: "<!-- SOLIDJS-DOCS-END -->",
    filter: (files) =>
      files.filter(
        (f) =>
          f.relativePath.startsWith("reference/") ||
          f.relativePath.startsWith("concepts/") ||
          f.relativePath.startsWith("advanced-concepts/") ||
          f.relativePath.startsWith("solid-router/") ||
          f.relativePath.startsWith("solid-start/"),
      ),
  },
};
