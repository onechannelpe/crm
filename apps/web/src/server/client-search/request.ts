import type { Document } from "~/server/shared/document";

import type { CompanyRegistryPort } from "./ports";

export interface EnrichmentCommand {
  enqueueRequest(
    document: Document,
    requestedByUserId: string | null,
    requestedAt?: Date,
  ): Promise<string>;
}

// Enqueues a registry verification. The wake lives in the repository's upsert, on
// the same executor the row is written on, so the enrichment queue is notified
// transactionally without a separate doorbell.
export function createEnrichmentCommand(
  repo: CompanyRegistryPort,
): EnrichmentCommand {
  return {
    enqueueRequest(document, requestedByUserId, requestedAt = new Date()) {
      return repo.upsertRequest({
        documentType: document.kind,
        documentValue: document.value,
        requestedByUserId,
        requestedAt,
        maxAttempts: 5,
      });
    },
  };
}
