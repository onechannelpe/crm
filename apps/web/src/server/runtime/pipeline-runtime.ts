import { createPipelineFeatureDeps } from "~/server/features/pipeline/application/pipeline-deps";
import { createSunatEnrichmentWritebackQueue } from "~/server/pipeline/queue/sunat-enrichment-writeback-queue";

import type { ServerInfra } from "./infra";

export function createPipelineRuntime(infra: ServerInfra) {
  return {
    deps: createPipelineFeatureDeps(infra.db),
    createSunatEnrichmentWritebackQueue: (workerId: string) =>
      createSunatEnrichmentWritebackQueue(workerId, {
        executor: infra.db,
      }),
  };
}
