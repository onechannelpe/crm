import { createWorkflowFeatureDeps } from "~/server/features/workflow/application/workflow-deps";
import type { WorkflowEngineGateway } from "~/server/workflow/application/ports/engine-gateway";
import { createSunatEnrichmentWritebackQueue } from "~/server/workflow/queue/sunat-enrichment-writeback-queue";

import type { ServerInfra } from "./infra";

export function createWorkflowRuntime(
  infra: ServerInfra,
  engineGateway: WorkflowEngineGateway,
) {
  return {
    deps: createWorkflowFeatureDeps(infra.db),
    engineGateway,
    createSunatEnrichmentWritebackQueue: (workerId: string) =>
      createSunatEnrichmentWritebackQueue(workerId, {
        executor: infra.db,
      }),
  };
}
