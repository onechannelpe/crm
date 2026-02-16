import type { FrameworkConfig } from "../core/types.ts";

export const solidjsConfig: FrameworkConfig = {
  name: "SolidJS",
  docsRoot: "./.docs/solidjs",
  gitRepo: "https://github.com/solidjs/solid-docs.git",
  gitPaths: ["src/routes"],
  agentSection: "WHEN writing SolidJS",
  markerStart: "<!-- SOLIDJS-DOCS-START -->",
  markerEnd: "<!-- SOLIDJS-DOCS-END -->",
  transform: (files) =>
    files.filter(
      (f) =>
        f.relativePath.startsWith("reference/") ||
        f.relativePath.startsWith("concepts/") ||
        f.relativePath.startsWith("advanced-concepts/") ||
        f.relativePath.startsWith("solid-router/") ||
        f.relativePath.startsWith("solid-start/")
    ),
};
