import { normalizeEnrichmentInput } from "./model";
import type { EnrichmentRepositoryPort } from "./ports";

/**
 * Single canonical enqueue interface for enrichment requests.
 * Idempotent: always succeeds, returns job ID.
 * Called by both UI actions and pipeline commands.
 */
export interface EnrichmentCommand {
  enqueueRequest(
    documentType: string,
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
      const normalized = normalizeEnrichmentInput({
        documentType,
        documentValue,
      });

      return repo.upsertJob({
        document_type: normalized.documentType,
        document_value: normalized.documentValue,
        requested_by_user_id: requestedByUserId,
        now,
        max_attempts: 5,
      });
    },
  };
}
