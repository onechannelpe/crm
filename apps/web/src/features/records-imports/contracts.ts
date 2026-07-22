import { isQueueState, type QueueState } from "~/lib/job-queue/queue-state";
import { defineTopic } from "~/lib/realtime/topic";

export type RecordImportType = "import_status" | "import_prioridad";

export interface RecordImportProgressEvent {
  type: "job_progress";
  jobId: string;
  importType: RecordImportType;
  queueState: QueueState;
  rowsApplied: number;
  rowsFailed: number;
  rowsTotal: number;
  errorMessage: string | null;
}

export const recordImportTopic = defineTopic("records.import.job");

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRecordImportProgressEvent(
  value: unknown,
): value is RecordImportProgressEvent {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    value.type === "job_progress" &&
    typeof value.jobId === "string" &&
    (value.importType === "import_status" ||
      value.importType === "import_prioridad") &&
    isQueueState(value.queueState) &&
    typeof value.rowsApplied === "number" &&
    typeof value.rowsFailed === "number" &&
    typeof value.rowsTotal === "number" &&
    (typeof value.errorMessage === "string" || value.errorMessage === null)
  );
}

export function parseRecordImportProgressMessage(
  raw: string,
): RecordImportProgressEvent | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return isRecordImportProgressEvent(parsed) ? parsed : null;
}
