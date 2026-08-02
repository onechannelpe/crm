import "server-only";
import { createSunatScraperClient } from "~/server/client-search/enrichment/sunat/client";
import { createCompanyRegistryRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import { createEnrichmentQuery } from "~/server/client-search/status";
import { createEnrichmentQueue } from "~/server/client-search/worker";
import type { ServerInfrastructure } from "~/server/platform/infrastructure";

export interface ClientSearchRuntimeDeps {
  fallbackOrganizationEnrichment(ruc: string): Promise<{
    legalName: string | null;
    address: string | null;
  } | null>;
  projectOrganization(input: {
    ruc: string;
    legalName: string | null;
    address: string | null;
    district: string | null;
    department: string | null;
  }): Promise<void>;
}

export function createClientSearchRuntime(
  serverInfrastructure: ServerInfrastructure,
  deps: ClientSearchRuntimeDeps,
) {
  const registry = createCompanyRegistryRepo(serverInfrastructure.db);
  const scraper = createSunatScraperClient();
  const enrichmentCommand = createEnrichmentCommand(registry);
  const enrichmentQuery = createEnrichmentQuery(registry);

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
        engineFallback: deps.fallbackOrganizationEnrichment,
        projectOrganization: deps.projectOrganization,
      }),
  };
}
