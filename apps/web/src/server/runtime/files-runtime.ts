import { config } from "~/lib/config";
import { createArtifactsRepo } from "~/server/files/repo/artifacts";
import { createAssetsRepo } from "~/server/files/repo/assets";
import { createEventsRepo } from "~/server/files/repo/events";
import { createNegotiationFilesRepo } from "~/server/files/repo/negotiation";
import { createSalesRepo } from "~/server/files/repo/sales";
import { createTokensRepo } from "~/server/files/repo/tokens";
import type { ArtifactRepos } from "~/server/files/service/contracts";
import { createFileStorage } from "~/server/files/storage";
import type { FileStorage } from "~/server/files/storage";

import type { ServerInfra } from "./infra";

export type FilesRuntime = {
  repo: ArtifactRepos;
  storage: FileStorage;
};

export function createFilesRuntime(infra: ServerInfra) {
  const repo = {
    artifacts: createArtifactsRepo(infra.db),
    assets: createAssetsRepo(infra.db),
    events: createEventsRepo(infra.db),
    tokens: createTokensRepo(infra.db),
    sales: createSalesRepo(infra.db),
    negotiation: createNegotiationFilesRepo(infra.db),
  };
  const storage = createFileStorage(config.uploads.storageRoot);

  const runtime: FilesRuntime = {
    repo,
    storage,
  };
  return runtime;
}
