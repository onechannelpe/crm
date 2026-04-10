import { config } from "~/lib/config";
import { createIntegrationRuntime } from "~/server/integrations/infrastructure/runtime";
import { createJobBlobStore } from "~/server/integrations/job-blob-store";

import type { ServerInfra } from "./infra";

export function createIntegrationsRuntime(infra: ServerInfra) {
  return {
    integration: createIntegrationRuntime(infra.db),
    blobStore: createJobBlobStore(config.uploads.storageRoot),
  };
}
