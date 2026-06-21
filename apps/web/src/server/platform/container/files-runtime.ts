import type { UploadsConfig } from "~/lib/env";
import { createArtifactsRepo } from "~/server/files/repo/artifacts";
import { createAssetsRepo } from "~/server/files/repo/assets";
import { createEventsRepo } from "~/server/files/repo/events";
import { createRateRevisionFilesRepo } from "~/server/files/repo/rate-revision";
import { createSalesRepo } from "~/server/files/repo/sales";
import { createTokensRepo } from "~/server/files/repo/tokens";
import type { ArtifactRepos } from "~/server/files/service/contracts";
import { createFileStorage, type FileStorage } from "~/server/files/storage";

import type { ServerInfra } from "./infra";

export type FilesRuntime = {
  repo: ArtifactRepos;
  storage: FileStorage;
};

export function createFilesRuntime(
  infra: ServerInfra,
  config: UploadsConfig,
): FilesRuntime {
  const repo: ArtifactRepos = {
    artifacts: createArtifactsRepo(infra.db),
    assets: createAssetsRepo(infra.db),
    events: createEventsRepo(infra.db),
    tokens: createTokensRepo(infra.db),
    sales: createSalesRepo(infra.db),
    rateRevision: createRateRevisionFilesRepo(infra.db),
  };

  return {
    repo,
    storage: createFileStorage(config.storageRoot),
  };
}
