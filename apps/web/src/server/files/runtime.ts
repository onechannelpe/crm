import "server-only";
import { createAssetsRepo } from "~/server/files/repo/assets";
import { createRateRevisionFilesRepo } from "~/server/files/repo/rate-revision";
import { createSalesRepo } from "~/server/files/repo/sales";
import { createTokensRepo } from "~/server/files/repo/tokens";
import type { FileRepos } from "~/server/files/service/contracts";
import { executeDownload } from "~/server/files/service/execute-download";
import { createFileStorage, type FileStorage } from "~/server/files/storage";
import type { ServerInfrastructure } from "~/server/platform/composition/infrastructure";
import type { UploadsConfig } from "~/server/platform/config/env";

export type FilesRuntime = {
  repo: FileRepos;
  storage: FileStorage;
  download: (
    token: Parameters<typeof executeDownload>[0],
    now: Parameters<typeof executeDownload>[2],
  ) => ReturnType<typeof executeDownload>;
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

  const storage = createFileStorage(config.storageRoot);

  return {
    repo,
    storage,
    download: (token, now) => executeDownload(token, { repo, storage }, now),
  };
}
