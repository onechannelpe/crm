import { createSearchEnrichmentService } from "~/server/client-search/enrichment-service";
import { createSearchEnrichmentRepo } from "~/server/client-search/repos-enrichment";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { isErr } from "~/server/shared/result";

export function createLeadEnrichmentQueue(executor: DatabaseExecutor) {
  const service = createSearchEnrichmentService({
    searchEnrichment: createSearchEnrichmentRepo(executor),
  });

  return {
    async enqueueRucVerification(ruc: string, requestedByUserId: number) {
      const result = await service.request("ruc", ruc, requestedByUserId);
      if (isErr(result)) {
        return;
      }
    },
  };
}
