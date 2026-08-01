import "server-only";
import { createAssetsRepo } from "~/server/files/repo/assets";
import { createRateRevisionFilesRepo } from "~/server/files/repo/rate-revision";
import { createSalesRepo } from "~/server/files/repo/sales";
import { createTokensRepo } from "~/server/files/repo/tokens";
import type { FileRepos } from "~/server/files/service/contracts";
import { createFileStorage, type FileStorage } from "~/server/files/storage";
import type { ServerInfrastructure } from "~/server/platform/composition/infrastructure";
import type { UploadsConfig } from "~/server/platform/config/env";

export type FilesRuntime = {
  repo: FileRepos;
  storage: FileStorage;
};

export function createFilesRuntime(
  serverInfrastructure: ServerInfrastructure,
  config: UploadsConfig,
): FilesRuntime {
  const repo: FileRepos = {
    assets: createAssetsRepo(serverInfrastructure.db),
    tokens: createTokensRepo(serverInfrastructure.db),
    sales: createSalesRepo(serverInfrastructure.db),
    rateRevision: createRateRevisionFilesRepo(serverInfrastructure.db),
  };

  return {
    repo,
    storage: createFileStorage(config.storageRoot),
  };
}
