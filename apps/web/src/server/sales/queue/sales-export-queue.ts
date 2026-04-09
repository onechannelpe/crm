import { createJobQueue } from "~/lib/job-queue/job-queue";
import { salesRuntime } from "~/server/runtime/sales-runtime";

import type { SalesExportProcessResult, SalesExportService } from "../types";

interface SalesExportQueueDeps {
  service?: SalesExportService;
  leaseMs?: number;
  batchSize?: number;
}

export function createSalesExportQueue(
  workerId: string,
  deps: SalesExportQueueDeps = {},
) {
  const leaseMs = deps.leaseMs ?? 30_000;
  const batchSize = deps.batchSize ?? 25;
  const service = deps.service ?? salesRuntime.salesExportService;

  return createJobQueue({
    name: "sales-export",
    leaseMs,
    batchSize,
    poll: (limit: number) =>
      service.reportExportJobsRepo.leaseQueuedJobs(limit, leaseMs, workerId),
    handle: (job, signal: AbortSignal) => service.processJob(job, signal),
    extendLease: (id: number) =>
      service.reportExportJobsRepo.extendLease(id, workerId, leaseMs),
    onComplete: async (id: number, result: SalesExportProcessResult) => {
      await service.reportExportJobsRepo.markJobCompleted(
        id,
        workerId,
        result.rowsCount,
        result.fileStorageKey,
        result.fileSha256,
        result.completedAt,
        result.expiresAt,
      );
    },
    onRetry: async (id: number, availableAt: number) => {
      await service.reportExportJobsRepo.scheduleRetry(id, availableAt);
    },
    onFail: async (id: number, reason: string) => {
      await service.reportExportJobsRepo.markJobFailed(
        id,
        workerId,
        reason,
        Date.now(),
      );
    },
  });
}
