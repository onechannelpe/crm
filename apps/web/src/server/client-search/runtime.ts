import "server-only";
import type { Document } from "~/domain/identity/document";
import { createSunatScraperClient } from "~/server/client-search/enrichment/sunat/client";
import { createCompanyRegistryRepo } from "~/server/client-search/repository";
import { createEnrichmentCommand } from "~/server/client-search/request";
import { createEnrichmentQuery } from "~/server/client-search/status";
import { createEnrichmentQueue } from "~/server/client-search/worker";
import type { ServerInfrastructure } from "~/server/platform/infrastructure";
import type { OperationContext } from "~/server/platform/operation/context";

// Function properties, not method shorthand: the queue receives these unbound,
// so a `this`-carrying signature would be a lie.
export interface ClientSearchRuntimeDeps {
  fallbackOrganizationEnrichment: (ruc: string) => Promise<{
    legalName: string | null;
    address: string | null;
  } | null>;
  projectOrganization: (input: {
    ruc: string;
    legalName: string | null;
    address: string | null;
    district: string | null;
    department: string | null;
  }) => Promise<void>;
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
      document: Document,
      requestedByUserId: string | null,
      operation: OperationContext,
    ) =>
      enrichmentCommand.enqueueRequest(document, requestedByUserId, operation),
    getEnrichmentStatus: (document: Document, operation: OperationContext) =>
      enrichmentQuery.getStatus(document, operation.operationAt),
    createEnrichmentQueue: (workerId: string) =>
      createEnrichmentQueue(workerId, {
        registry,
        scraper,
        engineFallback: deps.fallbackOrganizationEnrichment,
        projectOrganization: deps.projectOrganization,
      }),
  };
}
