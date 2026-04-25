import { createWorkflowFeatureDeps } from "~/server/features/workflow/application/workflow-deps";
import { createSunatEnrichmentWritebackQueue } from "~/server/workflow/queue/sunat-enrichment-writeback-queue";

import type { ServerInfra } from "./infra";

export function createWorkflowRuntime(infra: ServerInfra) {
  return {
    deps: createWorkflowFeatureDeps(infra.db, infra.engine),
    createSunatEnrichmentWritebackQueue: (workerId: string) =>
      createSunatEnrichmentWritebackQueue(workerId, {
        executor: infra.db,
      }),
  };
}
