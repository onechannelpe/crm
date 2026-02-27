import type { SourceConfig } from "../core/types.ts";

export const twentyFrontConfig: SourceConfig = {
  name: "twenty-front",
  repo: "https://github.com/twentyhq/twenty.git",
  mounts: [
    {
      repoPath: "packages/twenty-front/src",
      localPath: ".refs/twenty-front",
    },
  ],
};
