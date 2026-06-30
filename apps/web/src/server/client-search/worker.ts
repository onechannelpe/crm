import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import type { QueueDoorbell } from "~/lib/job-queue/doorbell";
import { createJobQueue } from "~/lib/job-queue/job-queue";
import type { SunatScraperClient } from "~/server/client-search/enrichment/sunat/contracts";
import type { ProcessResult } from "~/server/client-search/model";
import type { EnrichmentRepositoryPort } from "~/server/client-search/ports";
import {
  processEnrichmentJob,
  overlayToRow,
} from "~/server/client-search/process";

type EnrichmentWorkerDeps = {
  enrichmentRepo: EnrichmentRepositoryPort;
  scraper: SunatScraperClient;
  doorbell: QueueDoorbell;
};

export function createEnrichmentQueue(
  workerId: string,
  deps: EnrichmentWorkerDeps,
) {
  const leaseMs = 30_000;
  const batchSize = 20;
  const maxConcurrency = 3;
  const { doorbell, enrichmentRepo, scraper } = deps;

  return createJobQueue({
    name: "enrichment",
    leaseMs,
    batchSize,
    maxConcurrency,
    now: Date.now,
    poll: (limit: number) => enrichmentRepo.leaseJobs(limit, leaseMs, workerId),
    handle: async (job, signal) => {
      return processEnrichmentJob(job, scraper, signal);
    },
    onResult: async (job, result: ProcessResult) => {
      if (result.ok) {
        await enrichmentRepo.completeJob(
          job.id,
          workerId,
          overlayToRow(result.overlay),
          Date.now(),
        );
        doorbell.wake(JOB_CHANNELS.ENRICHMENT_WRITEBACK, job.id);
        return { kind: "complete" };
      }

      if (result.shouldRetry) {
        return {
          kind: "retry",
          availableAt: Date.now() + 60_000,
        };
      }

      return {
        kind: "fail",
        reason: `enrichment:${result.error.kind}`,
      };
    },
    extendLease: (id: number) =>
      enrichmentRepo.extendLease(id, workerId, leaseMs),
    onComplete: async (_id: number) => {
      // Job completion is persisted in onResult.
    },
    onRetry: async (id: number, availableAt: number) => {
      await enrichmentRepo.retryJob(id, workerId, "Retrying", availableAt);
    },
    onFail: async (id: number, reason: string) => {
      await enrichmentRepo.failJob(id, workerId, reason, Date.now());
    },
  });
}
