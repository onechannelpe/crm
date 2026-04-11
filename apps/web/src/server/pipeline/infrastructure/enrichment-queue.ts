import type { EnrichmentCommand } from "~/server/client-search/enqueue";

export type LeadEnrichmentQueue = {
  enqueueRucVerification(ruc: string, requestedByUserId: number): Promise<void>;
};

export function createLeadEnrichmentQueue(
  enrichmentCommand: EnrichmentCommand,
): LeadEnrichmentQueue {
  return {
    async enqueueRucVerification(ruc, requestedByUserId) {
      // Always idempotent: enqueue returns job ID, never throws
      await enrichmentCommand.enqueueRequest("ruc", ruc, requestedByUserId);
    },
  };
}
