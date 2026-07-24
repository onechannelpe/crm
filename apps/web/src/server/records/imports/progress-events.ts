import type { RecordImportProgressEvent } from "~/contracts/records/imports";
import { db } from "~/lib/db/db";
import { notify } from "~/lib/db/notify";
import { RECORDS_IMPORT_PROGRESS_CHANNEL } from "~/lib/job-queue/registry";
import type { IntegrationJobRow } from "~/server/integrations/types";

export function buildRecordImportProgressEvent(
  job: Pick<
    IntegrationJobRow,
    | "id"
    | "type"
    | "queue_state"
    | "rows_applied"
    | "rows_failed"
    | "rows_total"
    | "error_message"
  >,
): RecordImportProgressEvent {
  return {
    type: "job_progress",
    jobId: job.id,
    importType: job.type,
    queueState: job.queue_state,
    rowsApplied: job.rows_applied ?? 0,
    rowsFailed: job.rows_failed ?? 0,
    rowsTotal: job.rows_total ?? 0,
    errorMessage: job.error_message,
  };
}

export function publishRecordImportProgress(
  event: RecordImportProgressEvent,
): void {
  notify(db, RECORDS_IMPORT_PROGRESS_CHANNEL, JSON.stringify(event));
}
