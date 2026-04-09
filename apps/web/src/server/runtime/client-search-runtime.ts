import { createSearchEnrichmentService } from "~/server/client-search/enrichment-service";
import { createSearchEnrichmentRepo } from "~/server/client-search/repos-enrichment";

import type { ServerInfra } from "./infra";

export function createClientSearchRuntime(infra: ServerInfra) {
  return {
    searchEnrichmentService: createSearchEnrichmentService({
      searchEnrichment: createSearchEnrichmentRepo(infra.db),
    }),
  };
}
