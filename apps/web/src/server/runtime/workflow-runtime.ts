import { createWorkflowFeatureDeps } from "~/server/features/workflow/application/workflow-deps";
import type { EngineClient } from "~/server/shared/engine/client";
import { createSunatEnrichmentWritebackQueue } from "~/server/workflow/queue/sunat-enrichment-writeback-queue";

import type { ServerInfra } from "./infra";

export function createWorkflowRuntime(
  infra: ServerInfra,
  engine: EngineClient,
) {
  return {
    deps: createWorkflowFeatureDeps(infra.db, engine),
    createSunatEnrichmentWritebackQueue: (workerId: string) =>
      createSunatEnrichmentWritebackQueue(workerId, {
        executor: infra.db,
      }),
  };
}
