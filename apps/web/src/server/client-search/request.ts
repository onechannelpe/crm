import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import type { QueueDoorbell } from "~/lib/job-queue/doorbell";
import type { Document } from "~/server/shared/document";

import type { EnrichmentRepositoryPort } from "./ports";

export interface EnrichmentCommand {
  enqueueRequest(
    document: Document,
    requestedByUserId: number,
    now?: number,
  ): Promise<number>;
}

export function createEnrichmentCommand(
  repo: EnrichmentRepositoryPort,
  doorbell: QueueDoorbell,
): EnrichmentCommand {
  return {
    async enqueueRequest(document, requestedByUserId, now = Date.now()) {
      const jobId = await repo.upsertJob({
        document_type: document.kind,
        document_value: document.value,
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
