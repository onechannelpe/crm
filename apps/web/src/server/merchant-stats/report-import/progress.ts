import type { MerchantReportProgressEvent } from "~/features/dashboards/imports/contracts";
import { db } from "~/lib/db/db";
import { notify } from "~/lib/db/notify";
import { MERCHANT_REPORT_PROGRESS_CHANNEL } from "~/lib/job-queue/registry";

import type { MerchantReportImportRow } from "./repo";

export function buildMerchantReportProgressEvent(
  job: Pick<
    MerchantReportImportRow,
    | "id"
    | "queue_state"
    | "rows_applied"
    | "rows_failed"
    | "rows_total"
    | "error_message"
  >,
): MerchantReportProgressEvent {
  return {
    type: "merchant_report_progress",
    importId: job.id,
    queueState: job.queue_state,
    rowsApplied: job.rows_applied ?? 0,
    rowsFailed: job.rows_failed ?? 0,
    rowsTotal: job.rows_total ?? 0,
    errorMessage: job.error_message,
  };
}

export function publishMerchantReportProgress(
  event: MerchantReportProgressEvent,
): void {
  // Use a separate connection so the notification is not delayed by the batch transaction.
  notify(db, MERCHANT_REPORT_PROGRESS_CHANNEL, JSON.stringify(event));
}
