import { action, json } from "@solidjs/router";

import {
  confirmSalesRecord,
  registerSalesRecordAttempt,
  rejectSalesRecord,
} from "~/actions/sales-records";
import { pendingSalesRecordsQuery } from "~/lib/queries/sales-records";

export const confirmSalesRecordMutation = action(async (recordId: number) => {
  await confirmSalesRecord(recordId);
  return json({}, { revalidate: pendingSalesRecordsQuery.key });
}, "confirmSalesRecord");

export const rejectSalesRecordMutation = action(
  async (recordId: number, reason: string) => {
    await rejectSalesRecord(recordId, reason);
    return json({}, { revalidate: pendingSalesRecordsQuery.key });
  },
  "rejectSalesRecord",
);

export const registerSalesRecordAttemptMutation = action(
  async (
    recordId: number,
    outcome: string,
    notes: string | null,
    nextAttemptAt: number | null,
  ) => {
    await registerSalesRecordAttempt(recordId, outcome, notes, nextAttemptAt);
    return json({}, { revalidate: pendingSalesRecordsQuery.key });
  },
  "registerSalesRecordAttempt",
);
