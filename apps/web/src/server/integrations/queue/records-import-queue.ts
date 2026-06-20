import { createJobQueue } from "~/lib/job-queue/job-queue";
import {
  buildRecordImportProgressEvent,
  publishRecordImportProgress,
} from "~/server/records/imports/progress-events";
import { createRecordImportRunner } from "~/server/records/imports/runner";

import type {
  ImportJobProcessResult,
  IntegrationJobRow,
  IntegrationRuntime,
} from "../types";

interface RecordImportRunner {
  process(
    job: IntegrationJobRow,
    signal: AbortSignal,
  ): Promise<ImportJobProcessResult>;
}

interface RecordsImportQueueDeps {
  runtime: IntegrationRuntime;
  readFile: (filePath: string) => Promise<Uint8Array>;
  runner?: RecordImportRunner;
}

const RECORD_IMPORT_TYPES = ["import_status", "import_prioridad"] as const;

export function createRecordsImportQueue(
  workerId: string,
  deps: RecordsImportQueueDeps,
) {
  const leaseMs = 30_000;
  const batchSize = 10;
  const { runtime } = deps;
  const runner =
    deps.runner ??
    createRecordImportRunner({
      executor: deps.runtime.executor,
      readFile: deps.readFile,
      updateProgress: (progress) =>
        runtime.jobs.updateProgress(progress.jobId, progress),
    });

  return createJobQueue({
    name: "records-import",
    leaseMs,
    batchSize,
    poll: (limit: number) =>
      runtime.jobs.claimPending(leaseMs, workerId, limit, [
        ...RECORD_IMPORT_TYPES,
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
        publishRecordImportProgress(
          buildRecordImportProgressEvent({
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
        publishRecordImportProgress(
          buildRecordImportProgressEvent({
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
        publishRecordImportProgress(
          buildRecordImportProgressEvent({
            job,
            status: "FAILED",
            errorMessage: reason,
          }),
        );
      }
    },
  });
}
