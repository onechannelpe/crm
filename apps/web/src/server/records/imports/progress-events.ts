import type { RecordImportProgressEvent } from "~/contracts/records/imports";
import type { IntegrationJobRow } from "~/server/integrations/types";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { notify } from "~/server/platform/database/notifications/publish";

export const RECORDS_IMPORT_PROGRESS_CHANNEL = "records-import-progress";

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
  db: DatabaseExecutor,
  event: RecordImportProgressEvent,
): Promise<void> {
  return notify(db, RECORDS_IMPORT_PROGRESS_CHANNEL, JSON.stringify(event));
}
