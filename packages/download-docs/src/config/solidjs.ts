import type { FrameworkConfig } from "../core/types.ts";

export const solidjsConfig: FrameworkConfig = {
  name: "SolidJS",
  docsRoot: "./.docs/solidjs",
  gitRepo: "https://github.com/solidjs/solid-docs.git",
  gitPaths: ["src/routes"],
  agentSection: "WHEN writing SolidJS",
  markerStart: "<!-- SOLIDJS-DOCS-START -->",
  markerEnd: "<!-- SOLIDJS-DOCS-END -->",
};
