import { createJobQueue } from "~/lib/job-queue/job-queue";

import { getClientSearchRuntime } from "../runtime";
import type { SearchEnrichmentProcessResult } from "../types";

export function createEnrichmentQueue(workerId: string) {
  const leaseMs = 30_000;
  const batchSize = 20;
  const maxConcurrency = 3;
  const { searchEnrichmentService } = getClientSearchRuntime();

  return createJobQueue({
    name: "enrichment",
    leaseMs,
    batchSize,
    maxConcurrency,
    poll: (limit: number) =>
      searchEnrichmentService.searchEnrichmentRepo.leaseJobs(
        limit,
        leaseMs,
        workerId,
      ),
    handle: (job, signal: AbortSignal) =>
      searchEnrichmentService.processJob(job, signal),
    extendLease: (id: number) =>
      searchEnrichmentService.searchEnrichmentRepo.extendLease(
        id,
        workerId,
        leaseMs,
      ),
    onComplete: async (id: number, result: SearchEnrichmentProcessResult) => {
      await searchEnrichmentService.searchEnrichmentRepo.markJobCompleted(
        id,
        workerId,
        result.completedAt,
      );
    },
    onRetry: async (id: number, availableAt: number) => {
      await searchEnrichmentService.searchEnrichmentRepo.scheduleRetry(
        id,
        availableAt,
      );
    },
    onFail: async (id: number, reason: string) => {
      await searchEnrichmentService.searchEnrichmentRepo.markJobFailed(
        id,
        workerId,
        reason,
        Date.now(),
      );
    },
  });
}
