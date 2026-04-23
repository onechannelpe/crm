export type LeadImportType = "import_status" | "import_prioridad";

export type LeadImportJobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface LeadImportProgressEvent {
  type: "job_progress";
  jobId: string;
  importType: LeadImportType;
  status: LeadImportJobStatus;
  rowsApplied: number;
  rowsFailed: number;
  rowsTotal: number;
  errorMessage: string | null;
}

const LEAD_IMPORT_TOPIC_PREFIX = "leads.import.job";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function leadImportTopic(jobId: string): string {
  return `${LEAD_IMPORT_TOPIC_PREFIX}.${jobId}`;
}

export function parseLeadImportTopic(topic: string): string | null {
  if (!topic.startsWith(`${LEAD_IMPORT_TOPIC_PREFIX}.`)) {
    return null;
  }

  const rawJobId = topic.slice(`${LEAD_IMPORT_TOPIC_PREFIX}.`.length);
  if (rawJobId.trim().length < 1) {
    return null;
  }

  return rawJobId;
}

export function isLeadImportProgressEvent(
  value: unknown,
): value is LeadImportProgressEvent {
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

export function parseLeadImportProgressMessage(
  raw: string,
): LeadImportProgressEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return isLeadImportProgressEvent(parsed) ? parsed : null;
}
