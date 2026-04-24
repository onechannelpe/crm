import { config } from "~/lib/config";
import { createRecordsExportExecutor } from "~/server/files/records-export-executor";
import {
  createArtifactsRepo,
  createAssetsRepo,
  createEventsRepo,
  createSalesRepo,
  createTokensRepo,
} from "~/server/files/repo";
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
