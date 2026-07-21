import { type RecordImportProgressEvent } from "~/features/records-imports/contracts";
import { db } from "~/lib/db/db";
import { notify } from "~/lib/db/notify";
import type { QueueState } from "~/lib/job-queue/job-store";
import { RECORDS_IMPORT_PROGRESS_CHANNEL } from "~/lib/job-queue/registry";
import type {
  IntegrationJobRow,
  IntegrationJobsPort,
} from "~/server/integrations/types";
import { IntegrationJobId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

export async function findRecordImportJob(
  jobs: Pick<IntegrationJobsPort, "findById">,
  jobId: string,
): Promise<IntegrationJobRow | null> {
  const parsedJobId = IntegrationJobId.parse(jobId);

  if (isErr(parsedJobId)) return null;

  return (await jobs.findById(parsedJobId.value)) ?? null;
}

export function buildRecordImportProgressEvent(input: {
  job: Pick<
    IntegrationJobRow,
    | "id"
    | "type"
    | "queue_state"
    | "rows_applied"
    | "rows_failed"
    | "rows_total"
    | "error_message"
  >;
  rowsApplied?: number;
  rowsFailed?: number;
  rowsTotal?: number;
  queueState?: QueueState;
  errorMessage?: string | null;
}): RecordImportProgressEvent {
  return {
    type: "job_progress",
    jobId: input.job.id,
    importType: input.job.type,
    queueState: input.queueState ?? input.job.queue_state,
    rowsApplied: input.rowsApplied ?? input.job.rows_applied ?? 0,
    rowsFailed: input.rowsFailed ?? input.job.rows_failed ?? 0,
    rowsTotal: input.rowsTotal ?? input.job.rows_total ?? 0,
    errorMessage: input.errorMessage ?? input.job.error_message,
  };
}

export function publishRecordImportProgress(
  event: RecordImportProgressEvent,
): void {
  notify(db, RECORDS_IMPORT_PROGRESS_CHANNEL, JSON.stringify(event));
}
