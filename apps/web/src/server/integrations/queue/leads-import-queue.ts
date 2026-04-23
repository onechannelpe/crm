import { createJobQueue } from "~/lib/job-queue/job-queue";
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

interface LeadsImportQueueDeps {
  runtime: IntegrationRuntime;
  openFileStream: (filePath: string) => ReadableStream<Uint8Array>;
  runner?: LeadImportRunner;
}

const LEAD_IMPORT_TYPES = ["import_status", "import_prioridad"] as const;

export function createLeadsImportQueue(
  workerId: string,
  deps: LeadsImportQueueDeps,
) {
  const leaseMs = 30_000;
  const batchSize = 10;
  const { runtime } = deps;
  const runner =
    deps.runner ??
    createLeadImportRunner({
      executor: deps.runtime.executor,
      openFileStream: deps.openFileStream,
      updateProgress: (progress) =>
        runtime.jobs.updateProgress(progress.jobId, progress),
    });

  return createJobQueue({
    name: "leads-import",
    leaseMs,
    batchSize,
    poll: (limit: number) =>
      runtime.jobs.claimPending(leaseMs, workerId, limit, [
        ...LEAD_IMPORT_TYPES,
      ]),
    handle: async (job, signal: AbortSignal) => runner.process(job, signal),
    extendLease: (id: string) =>
      runtime.jobs.extendLease(id, workerId, leaseMs),
    onComplete: async (id: string, result: ImportJobProcessResult) => {
      await runtime.jobs.markCompleted(id, {
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
    onRetry: async (id: string, availableAt: number) => {
      await runtime.jobs.scheduleRetry(id, availableAt);
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
    onFail: async (id: string, reason: string) => {
      await runtime.jobs.markFailed(id, reason);
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
