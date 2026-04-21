import {
  type LeadImportProgressEvent,
  type LeadImportType,
} from "~/features/leads-imports/contracts";
import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { publishJson } from "~/lib/redis/publisher";
import type {
  IntegrationJobRow,
  IntegrationJobStatus,
} from "~/server/integrations/types";

function toLeadImportType(type: IntegrationJobRow["type"]): LeadImportType {
  if (type === "import_status" || type === "import_prioridad") {
    return type;
  }

  throw new Error(`Unsupported lead import type: ${type}`);
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
  await publishJson(JOB_CHANNELS.LEADS_IMPORT_PROGRESS, event);
}
