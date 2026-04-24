import { config } from "~/lib/config";
import { createRecordsExportExecutor } from "~/server/files/records-export-executor";
import { createArtifactsRepo } from "~/server/files/repo/artifacts";
import { createAssetsRepo } from "~/server/files/repo/assets";
import { createEventsRepo } from "~/server/files/repo/events";
import { createSalesRepo } from "~/server/files/repo/sales";
import { createTokensRepo } from "~/server/files/repo/tokens";

import { createFileStorage } from "~/server/files/storage";
import { createLeadQueries } from "~/server/workflow/infrastructure/lead-queries";

import type { ServerInfra } from "./infra";

export function createFilesRuntime(infra: ServerInfra) {
  const repo = {
    artifacts: createArtifactsRepo(infra.db),
    assets: createAssetsRepo(infra.db),
    events: createEventsRepo(infra.db),
    tokens: createTokensRepo(infra.db),
    sales: createSalesRepo(infra.db),
  };
  const storage = createFileStorage(config.uploads.storageRoot);
  const syncExecutor = createRecordsExportExecutor(createLeadQueries(infra.db));

  return {
    repo,
    storage,
    syncExecutor,
  };
}
