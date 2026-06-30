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
  const { runtime } = deps;
  const runner =
    deps.runner ??
    createRecordImportRunner({
      executor: deps.runtime.executor,
      now: deps.runtime.now,
      readFile: deps.readFile,
      updateProgress: (progress) =>
        runtime.jobs.updateProgress(progress.jobId, progress),
    });

  async function publishImportProgress(
    id: string,
    status: "COMPLETED" | "PENDING" | "FAILED",
    errorMessage: string | null,
  ): Promise<void> {
    const job = await runtime.jobs.findById(id);
    if (
      !job ||
      (job.type !== "import_status" && job.type !== "import_prioridad")
    ) {
      return;
    }
    publishRecordImportProgress(
      buildRecordImportProgressEvent({
        job,
        status,
        rowsApplied: job.rows_applied ?? undefined,
        rowsFailed: job.rows_failed ?? undefined,
        rowsTotal: job.rows_total ?? undefined,
        errorMessage,
      }),
    );
  }

  return createJobQueue<IntegrationJobRow>({
    name: "records-import",
    leaseMs,
    now: runtime.now,
    workerId,
    store: runtime.jobs.store,
    // The integration table multiplexes job kinds; this queue claims only imports.
    claimFilter: { column: "type", values: [...RECORD_IMPORT_TYPES] },
    handle: async (job, signal: AbortSignal) => {
      const result = await runner.process(job, signal);
      // status/completed_at are owned by the store's lifecycle map; only the row
      // counts and results payload ride the domain patch.
      return {
        kind: "done",
        patch: {
          rows_total: result.rowsTotal,
          rows_applied: result.rowsApplied,
          rows_failed: result.rowsFailed,
          results_json: result.resultsJson,
        },
      };
    },
    // Stream the persisted outcome to the browser after each settle.
    onSettled: async (job, outcome) => {
      if (outcome.kind === "done") {
        await publishImportProgress(job.id, "COMPLETED", null);
      } else if (outcome.kind === "retry") {
        await publishImportProgress(job.id, "PENDING", null);
      } else {
        await publishImportProgress(job.id, "FAILED", outcome.reason);
      }
    },
  });
}
