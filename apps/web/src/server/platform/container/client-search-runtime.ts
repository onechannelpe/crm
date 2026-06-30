import { createSunatScraperClient } from "~/server/client-search/enrichment/sunat/client";
import { createCompanyRegistryRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import { createEnrichmentQuery } from "~/server/client-search/status";
import { createEnrichmentQueue } from "~/server/client-search/worker";
import { createOrganizationEnrichmentProjection } from "~/server/identity/organization/apply-enrichment";
import { createOrganizationEnrichment } from "~/server/identity/organization/enrichment";
import { createPartyRepo } from "~/server/identity/organization/repo";
import type { EngineClient } from "~/server/shared/engine/client";

import type { ServerInfra } from "./infra";

export function createClientSearchRuntime(
  infra: ServerInfra,
  engine: EngineClient,
) {
  const registry = createCompanyRegistryRepo(infra.db);
  const scraper = createSunatScraperClient();
  const enrichmentCommand = createEnrichmentCommand(registry);
  const enrichmentQuery = createEnrichmentQuery(registry);

  // SUNAT-unreachable fallback + the inline projection onto the organization.
  const engineFallback = createOrganizationEnrichment(engine);
  const projectOrganization = createOrganizationEnrichmentProjection(
    createPartyRepo(infra.db),
  );

  return {
    enrichmentCommand,
    enrichmentQuery,
    createEnrichmentQueue: (workerId: string) =>
      createEnrichmentQueue(workerId, {
        registry,
        scraper,
        engineFallback: (ruc) => engineFallback.enrichByRuc(ruc),
        projectOrganization,
      }),
  };
}
