import type { SourceConfig } from "../core/types.ts";

export const twentyUiConfig: SourceConfig = {
  name: "twenty-ui",
  repo: "https://github.com/twentyhq/twenty.git",
  mounts: [
    {
      repoPath: "packages/twenty-ui/src",
      localPath: ".refs/twenty-ui",
    },
  ],
};
