import type { EnrichmentDocumentType, EnrichmentRepositoryPort } from "./types";

/**
 * Single canonical enqueue interface for enrichment requests.
 * Idempotent: always succeeds, returns job ID.
 * Called by both UI actions and pipeline commands.
 */
export interface EnrichmentCommand {
  enqueueRequest(
    documentType: EnrichmentDocumentType,
    documentValue: string,
    requestedByUserId: number,
    now?: number,
  ): Promise<number>;
}

export function createEnrichmentCommand(
  repo: EnrichmentRepositoryPort,
): EnrichmentCommand {
  return {
    async enqueueRequest(
      documentType,
      documentValue,
      requestedByUserId,
      now = Date.now(),
    ) {
      // Atomic idempotent upsert: always returns job ID, never fails
      return repo.upsertJob({
        document_type: documentType,
        document_value: documentValue,
        requested_by_user_id: requestedByUserId,
        now,
        max_attempts: 5,
      });
    },
  };
}
