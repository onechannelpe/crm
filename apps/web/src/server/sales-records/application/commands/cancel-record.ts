import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import type { SalesRecordMutationResult } from "../contracts";
import {
  assertTransition,
  getSalesRecordAudit,
  okCommandResult,
  runSalesRecordMutation,
  salesRecordFailure,
  type SalesRecordMutationDeps,
} from "./shared";

export async function cancelRecord(
  ctx: AppContext,
  deps: SalesRecordMutationDeps,
  input: { recordId: number },
): Promise<Result<SalesRecordMutationResult, DomainError>> {
  return runSalesRecordMutation(deps, async (repos) => {
    const audit = getSalesRecordAudit(repos);
    const record = await repos.salesRecords.findById(input.recordId);
    if (!record) {
      return salesRecordFailure("not_found", "Sales record not found");
    }
    if (record.executive_user_id !== ctx.actor.userId) {
      return salesRecordFailure("forbidden", "Not your sales record");
    }
    const transition = assertTransition(record.status, "cancelled", "cancel");
    if (!transition.ok) {
      return transition;
    }

    const now = Date.now();
    await repos.salesRecords.updateStatus(input.recordId, "cancelled", {
      cancelled_at: now,
    });
    await audit.log(
      ctx.actor.userId,
      "sales_record_cancelled",
      "sales_record",
      input.recordId,
      { from: record.status, to: "cancelled" },
    );
    return okCommandResult();
  });
}
