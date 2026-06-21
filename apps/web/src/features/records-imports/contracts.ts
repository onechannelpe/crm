export type RecordImportType = "import_status" | "import_prioridad";

type RecordImportJobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface RecordImportProgressEvent {
  type: "job_progress";
  jobId: string;
  importType: RecordImportType;
  status: RecordImportJobStatus;
  rowsApplied: number;
  rowsFailed: number;
  rowsTotal: number;
  errorMessage: string | null;
}

const RECORD_IMPORT_TOPIC_PREFIX = "records.import.job";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function recordImportTopic(jobId: string): string {
  return `${RECORD_IMPORT_TOPIC_PREFIX}.${jobId}`;
}

export function parseRecordImportTopic(topic: string): string | null {
  if (!topic.startsWith(`${RECORD_IMPORT_TOPIC_PREFIX}.`)) {
    return null;
  }

  const rawJobId = topic.slice(`${RECORD_IMPORT_TOPIC_PREFIX}.`.length);
  if (rawJobId.trim().length < 1) {
    return null;
  }

  return rawJobId;
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
    (value.status === "PENDING" ||
      value.status === "PROCESSING" ||
      value.status === "COMPLETED" ||
      value.status === "FAILED") &&
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
