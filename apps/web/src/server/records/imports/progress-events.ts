import {
  type RecordImportProgressEvent,
  type RecordImportType,
} from "~/features/records-imports/contracts";
import { db } from "~/lib/db/db";
import { notify } from "~/lib/db/notify";
import { RECORDS_IMPORT_PROGRESS_CHANNEL } from "~/lib/job-queue/registry";
import type {
  IntegrationJobRow,
  IntegrationJobsPort,
  IntegrationJobStatus,
} from "~/server/integrations/types";
import { asIntegrationJobId } from "~/server/shared/ids";

function toRecordImportType(type: IntegrationJobRow["type"]): RecordImportType {
  if (type === "import_status" || type === "import_prioridad") {
    return type;
  }

  throw new Error(`Unsupported record import type: ${type}`);
}

export async function findRecordImportJob(
  jobs: Pick<IntegrationJobsPort, "findById">,
  jobId: string,
): Promise<IntegrationJobRow | null> {
  const job = await jobs.findById(asIntegrationJobId(jobId));
  if (job?.type !== "import_status" && job?.type !== "import_prioridad") {
    return null;
  }

  return job;
}

export function buildRecordImportProgressEvent(input: {
  job: Pick<
    IntegrationJobRow,
    | "id"
    | "type"
    | "status"
    | "rows_applied"
    | "rows_failed"
    | "rows_total"
    | "error_message"
  >;
  rowsApplied?: number;
  rowsFailed?: number;
  rowsTotal?: number;
  status?: IntegrationJobStatus;
  errorMessage?: string | null;
}): RecordImportProgressEvent {
  return {
    type: "job_progress",
    jobId: input.job.id,
    importType: toRecordImportType(input.job.type),
    status: input.status ?? input.job.status,
    rowsApplied: input.rowsApplied ?? input.job.rows_applied ?? 0,
    rowsFailed: input.rowsFailed ?? input.job.rows_failed ?? 0,
    rowsTotal: input.rowsTotal ?? input.job.rows_total ?? 0,
    errorMessage: input.errorMessage ?? input.job.error_message,
  };
}

export function publishRecordImportProgress(
  event: RecordImportProgressEvent,
): void {
  // Progress is ephemeral and not part of any business transaction: fires on
  // the pooled db handle and delivers immediately.
  notify(db, RECORDS_IMPORT_PROGRESS_CHANNEL, JSON.stringify(event));
}
