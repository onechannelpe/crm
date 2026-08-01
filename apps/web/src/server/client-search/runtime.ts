import "server-only";
import { createSunatScraperClient } from "~/server/client-search/enrichment/sunat/client";
import { createCompanyRegistryRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import { createEnrichmentQuery } from "~/server/client-search/status";
import { createEnrichmentQueue } from "~/server/client-search/worker";
import type { EngineClient } from "~/server/integrations/engine/client";
import { createOrganizationEnrichmentProjection } from "~/server/organization/apply-enrichment";
import { createOrganizationEnrichment } from "~/server/organization/enrichment";
import { createOrganizationRepo } from "~/server/organization/organization-repo";
import type { ServerInfrastructure } from "~/server/platform/composition/infrastructure";

export function createClientSearchRuntime(
  serverInfrastructure: ServerInfrastructure,
  engine: EngineClient,
) {
  const registry = createCompanyRegistryRepo(serverInfrastructure.db);
  const scraper = createSunatScraperClient();
  const enrichmentCommand = createEnrichmentCommand(registry);
  const enrichmentQuery = createEnrichmentQuery(registry);

  const engineFallback = createOrganizationEnrichment(engine);
  const projectOrganization = createOrganizationEnrichmentProjection(
    createOrganizationRepo(serverInfrastructure.db),
  );

  return {
    requestEnrichment: (
      document: Parameters<typeof enrichmentCommand.enqueueRequest>[0],
      requestedByUserId: Parameters<typeof enrichmentCommand.enqueueRequest>[1],
      requestedAt: Parameters<typeof enrichmentCommand.enqueueRequest>[2],
    ) =>
      enrichmentCommand.enqueueRequest(
        document,
        requestedByUserId,
        requestedAt,
      ),
    getEnrichmentStatus: (
      document: Parameters<typeof enrichmentQuery.getStatus>[0],
      evaluatedAt: Parameters<typeof enrichmentQuery.getStatus>[1],
    ) => enrichmentQuery.getStatus(document, evaluatedAt),
    createEnrichmentQueue: (workerId: string) =>
      createEnrichmentQueue(workerId, {
        registry,
        scraper,
        engineFallback: (ruc) => engineFallback.enrichByRuc(ruc),
        projectOrganization,
      }),
  };
}
