import type { Document } from "~/server/shared/document";

import type { EnrichmentRepositoryPort } from "./ports";

export interface EnrichmentCommand {
  enqueueRequest(
    document: Document,
    requestedByUserId: string,
    now?: Date,
  ): Promise<string>;
}

// Enqueues a SUNAT verification. The wake lives in the repository's upsert, on
// the same executor the row is written on, so the enrichment queue is notified
// transactionally without a separate doorbell.
export function createEnrichmentCommand(
  repo: EnrichmentRepositoryPort,
): EnrichmentCommand {
  return {
    enqueueRequest(document, requestedByUserId, now = new Date()) {
      return repo.upsertJob({
        document_type: document.kind,
        document_value: document.value,
        requested_by_user_id: requestedByUserId,
        now,
        max_attempts: 5,
      });
    },
  };
}
