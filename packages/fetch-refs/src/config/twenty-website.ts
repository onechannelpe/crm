import type { SourceConfig } from "../core/types.ts";

export const twentyWebsiteConfig: SourceConfig = {
  name: "twenty-website",
  repo: "https://github.com/twentyhq/twenty.git",
  mounts: [
    {
      repoPath: "packages/twenty-website-new/src",
      localPath: ".refs/twenty-website-new",
    },
  ],
};
