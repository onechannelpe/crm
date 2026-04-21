import { config } from "~/lib/config";
import { createLeadsExportExecutor } from "~/server/files/leads-export-executor";
import { createArtifactRepo } from "~/server/files/repo";
import { createFileStorage } from "~/server/files/storage";
import { createLeadQueries } from "~/server/pipeline/infrastructure/lead-queries";

import type { ServerInfra } from "./infra";

export function createFilesRuntime(infra: ServerInfra) {
  const repo = createArtifactRepo(infra.db);
  const storage = createFileStorage(config.uploads.storageRoot);
  const syncExecutor = createLeadsExportExecutor(createLeadQueries(infra.db));

  return {
    repo,
    storage,
    syncExecutor,
  };
}
