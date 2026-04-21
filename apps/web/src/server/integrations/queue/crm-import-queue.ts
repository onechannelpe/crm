import { createJobQueue } from "~/lib/job-queue/job-queue";
import type { FileStorage } from "~/server/files/storage";
import {
  markLeadImportCompleted,
  markLeadImportFailed,
  scheduleLeadImportRetry,
  updateLeadImportProgress,
  claimPendingLeadImportJobs,
} from "~/server/leads/imports/job-repo";
import {
  buildLeadImportProgressEvent,
  publishLeadImportProgress,
} from "~/server/leads/imports/progress-events";
import { createLeadImportRunner } from "~/server/leads/imports/runner";

import type {
  ImportJobProcessResult,
  IntegrationJobRow,
  IntegrationRuntime,
} from "../types";

interface LeadImportRunner {
  process(
    job: IntegrationJobRow,
    signal: AbortSignal,
  ): Promise<ImportJobProcessResult>;
}

interface CrmImportQueueDeps {
  runtime: IntegrationRuntime;
  blobStore: Pick<FileStorage, "getBytes">;
  runner?: LeadImportRunner;
}

export function createCrmImportQueue(
  workerId: string,
  deps: CrmImportQueueDeps,
) {
  const leaseMs = 30_000;
  const batchSize = 10;
  const { runtime } = deps;
  const runner =
    deps.runner ??
    createLeadImportRunner({
      executor: deps.runtime.executor,
      blobStore: deps.blobStore,
      updateProgress: (progress) =>
        updateLeadImportProgress(runtime.jobs, progress.jobId, progress),
    });

  return createJobQueue({
    name: "crm-import",
    leaseMs,
    batchSize,
    poll: (limit: number) =>
      claimPendingLeadImportJobs(runtime.jobs, leaseMs, workerId, limit),
    handle: async (job, signal: AbortSignal) => {
      await publishLeadImportProgress(
        buildLeadImportProgressEvent({
          job,
          status: "PROCESSING",
          rowsApplied: job.rows_applied ?? 0,
          rowsFailed: job.rows_failed ?? 0,
          rowsTotal: job.rows_total ?? 0,
          errorMessage: null,
        }),
      );
      return runner.process(job, signal);
    },
    extendLease: (id: number) =>
      runtime.jobs.extendLease(id, workerId, leaseMs),
    onComplete: async (id: number, result: ImportJobProcessResult) => {
      await markLeadImportCompleted(runtime.jobs, id, {
        rowsTotal: result.rowsTotal,
        rowsApplied: result.rowsApplied,
        rowsFailed: result.rowsFailed,
        resultsJson: result.resultsJson,
      });
      const job = await runtime.jobs.findById(id);
      if (
        job &&
        (job.type === "import_status" || job.type === "import_prioridad")
      ) {
        await publishLeadImportProgress(
          buildLeadImportProgressEvent({
            job,
            status: "COMPLETED",
            rowsApplied: result.rowsApplied,
            rowsFailed: result.rowsFailed,
            rowsTotal: result.rowsTotal,
            errorMessage: null,
          }),
        );
      }
    },
    onRetry: async (id: number, availableAt: number) => {
      await scheduleLeadImportRetry(runtime.jobs, id, availableAt);
      const job = await runtime.jobs.findById(id);
      if (
        job &&
        (job.type === "import_status" || job.type === "import_prioridad")
      ) {
        await publishLeadImportProgress(
          buildLeadImportProgressEvent({
            job,
            status: "PENDING",
          }),
        );
      }
    },
    onFail: async (id: number, reason: string) => {
      await markLeadImportFailed(runtime.jobs, id, reason);
      const job = await runtime.jobs.findById(id);
      if (
        job &&
        (job.type === "import_status" || job.type === "import_prioridad")
      ) {
        await publishLeadImportProgress(
          buildLeadImportProgressEvent({
            job,
            status: "FAILED",
            errorMessage: reason,
          }),
        );
      }
    },
  });
}
