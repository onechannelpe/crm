import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { getPublisher } from "~/lib/redis/publisher";
import type {
  IntegrationJobRow,
  IntegrationJobStatus,
} from "~/server/integrations/types";

import type { LeadImportType } from "./type-detection";

export interface LeadImportProgressEvent {
  type: "job_progress";
  jobId: number;
  importType: LeadImportType;
  status: IntegrationJobStatus;
  rowsApplied: number;
  rowsFailed: number;
  rowsTotal: number;
  errorMessage: string | null;
}

function toLeadImportType(type: IntegrationJobRow["type"]): LeadImportType {
  if (type === "import_status" || type === "import_prioridad") {
    return type;
  }

  throw new Error(`Unsupported lead import type: ${type}`);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isLeadImportProgressEvent(
  value: unknown,
): value is LeadImportProgressEvent {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    value.type === "job_progress" &&
    typeof value.jobId === "number" &&
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

export function buildLeadImportProgressEvent(input: {
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
}): LeadImportProgressEvent {
  return {
    type: "job_progress",
    jobId: input.job.id,
    importType: toLeadImportType(input.job.type),
    status: input.status ?? input.job.status,
    rowsApplied: input.rowsApplied ?? input.job.rows_applied ?? 0,
    rowsFailed: input.rowsFailed ?? input.job.rows_failed ?? 0,
    rowsTotal: input.rowsTotal ?? input.job.rows_total ?? 0,
    errorMessage: input.errorMessage ?? input.job.error_message,
  };
}

export async function publishLeadImportProgress(
  event: LeadImportProgressEvent,
): Promise<void> {
  try {
    await getPublisher().publish(
      JOB_CHANNELS.LEADS_IMPORT_PROGRESS,
      JSON.stringify(event),
    );
  } catch {
    // Best effort only. Fallback polling reads persisted job state.
  }
}
