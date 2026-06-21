import {
  type RecordImportProgressEvent,
  type RecordImportType,
} from "~/features/records-imports/contracts";
import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { publishMessage } from "~/lib/redis/publisher";
import type {
  IntegrationJobRow,
  IntegrationJobStatus,
} from "~/server/integrations/types";

function toRecordImportType(type: IntegrationJobRow["type"]): RecordImportType {
  if (type === "import_status" || type === "import_prioridad") {
    return type;
  }

  throw new Error(`Unsupported record import type: ${type}`);
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
  publishMessage(JOB_CHANNELS.RECORDS_IMPORT_PROGRESS, event);
}
