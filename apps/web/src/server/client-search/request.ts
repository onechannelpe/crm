import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import type { QueueDoorbell } from "~/lib/job-queue/doorbell";

import { normalizeEnrichmentInput } from "./model";
import type { EnrichmentRepositoryPort } from "./ports";

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
  doorbell: QueueDoorbell,
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

      const jobId = await repo.upsertJob({
        document_type: normalized.documentType,
        document_value: normalized.documentValue,
        requested_by_user_id: requestedByUserId,
        now,
        max_attempts: 5,
      });

      // Persistence is authoritative; Redis only wakes the worker.
      doorbell.wake(JOB_CHANNELS.ENRICHMENT, jobId);

      return jobId;
    },
  };
}
