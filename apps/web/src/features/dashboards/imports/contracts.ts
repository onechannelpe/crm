import { isQueueState, type QueueState } from "~/lib/job-queue/queue-state";
import { defineTopic } from "~/lib/realtime/topic";

export interface MerchantReportProgressEvent {
  type: "merchant_report_progress";
  importId: string;
  queueState: QueueState;
  rowsApplied: number;
  rowsFailed: number;
  rowsTotal: number;
  errorMessage: string | null;
}

export const merchantReportTopic = defineTopic("merchant.report.import");

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMerchantReportProgressEvent(
  value: unknown,
): value is MerchantReportProgressEvent {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    value.type === "merchant_report_progress" &&
    typeof value.importId === "string" &&
    isQueueState(value.queueState) &&
    typeof value.rowsApplied === "number" &&
    typeof value.rowsFailed === "number" &&
    typeof value.rowsTotal === "number" &&
    (typeof value.errorMessage === "string" || value.errorMessage === null)
  );
}

export function parseMerchantReportProgressMessage(
  raw: string,
): MerchantReportProgressEvent | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return isMerchantReportProgressEvent(parsed) ? parsed : null;
}
