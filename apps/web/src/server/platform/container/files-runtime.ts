import { createAssetsRepo } from "~/server/files/repo/assets";
import { createRateRevisionFilesRepo } from "~/server/files/repo/rate-revision";
import { createSalesRepo } from "~/server/files/repo/sales";
import { createTokensRepo } from "~/server/files/repo/tokens";
import type { FileRepos } from "~/server/files/service/contracts";
import { createFileStorage, type FileStorage } from "~/server/files/storage";
import type { UploadsConfig } from "~/server/platform/config/env";

import type { ServerInfra } from "./infra";

export type FilesRuntime = {
  repo: FileRepos;
  storage: FileStorage;
};

export function createFilesRuntime(
  infra: ServerInfra,
  config: UploadsConfig,
): FilesRuntime {
  const repo: FileRepos = {
    assets: createAssetsRepo(infra.db),
    tokens: createTokensRepo(infra.db),
    sales: createSalesRepo(infra.db),
    rateRevision: createRateRevisionFilesRepo(infra.db),
  };

  return {
    repo,
    storage: createFileStorage(config.storageRoot),
  };
}
