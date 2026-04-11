import { createEnrichmentCommand } from "~/server/client-search/enqueue";
import { createSunatScraperClient } from "~/server/client-search/enrichment/sunat/client";
import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentQuery } from "~/server/client-search/status";
import { createEnrichmentQueue } from "~/server/client-search/worker";

import type { ServerInfra } from "./infra";

export function createClientSearchRuntime(infra: ServerInfra) {
  const enrichmentRepo = createSearchEnrichmentRepo(infra.db);
  const scraper = createSunatScraperClient();
  const enrichmentCommand = createEnrichmentCommand(enrichmentRepo);
  const enrichmentQuery = createEnrichmentQuery(enrichmentRepo);

  return {
    enrichmentCommand,
    enrichmentQuery,
    createEnrichmentQueue: (workerId: string) =>
      createEnrichmentQueue(workerId, { enrichmentRepo, scraper }),
  };
}
