import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { publishJobId } from "~/lib/redis/publisher";

import { normalizeEnrichmentInput } from "./model";
import type { EnrichmentRepositoryPort } from "./ports";

/**
 * Single canonical enqueue interface for enrichment requests.
 * The job row is the source of truth. Redis publish is a best-effort wakeup
 * after persistence, so callers can rely on the returned job id once this
 * resolves.
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

      const jobId = await repo.upsertJob({
        document_type: normalized.documentType,
        document_value: normalized.documentValue,
        requested_by_user_id: requestedByUserId,
        now,
        max_attempts: 5,
      });

      await publishJobId(JOB_CHANNELS.ENRICHMENT, jobId);

      return jobId;
    },
  };
}
