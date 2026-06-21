import type { QueueDoorbell } from "~/lib/job-queue/doorbell";
import { createSunatScraperClient } from "~/server/client-search/enrichment/sunat/client";
import { createSearchEnrichmentRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import { createEnrichmentQuery } from "~/server/client-search/status";
import { createEnrichmentQueue } from "~/server/client-search/worker";

import type { ServerInfra } from "./infra";

export function createClientSearchRuntime(
  infra: ServerInfra,
  doorbell: QueueDoorbell,
) {
  const enrichmentRepo = createSearchEnrichmentRepo(infra.db);
  const scraper = createSunatScraperClient();
  const enrichmentCommand = createEnrichmentCommand(enrichmentRepo, doorbell);
  const enrichmentQuery = createEnrichmentQuery(enrichmentRepo);

  return {
    enrichmentCommand,
    enrichmentQuery,
    createEnrichmentQueue: (workerId: string) =>
      createEnrichmentQueue(workerId, {
        doorbell,
        enrichmentRepo,
        scraper,
      }),
  };
}
