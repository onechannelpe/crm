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

export async function confirmRecord(
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
    if (
      ctx.actor.role !== "superuser" &&
      record.branch_id !== ctx.actor.branchId
    ) {
      return salesRecordFailure(
        "forbidden",
        "Cannot confirm a sales record from another branch",
      );
    }
    const transition = assertTransition(record.status, "confirmed", "confirm");
    if (!transition.ok) {
      return transition;
    }

    const now = Date.now();
    await repos.salesRecords.updateStatus(input.recordId, "confirmed", {
      confirmed_at: now,
    });
    await audit.log(
      ctx.actor.userId,
      "sales_record_confirmed",
      "sales_record",
      `${input.recordId}`,
      { from: record.status, to: "confirmed" },
    );
    return okCommandResult();
  });
}
