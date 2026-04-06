import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import {
  getSalesRecordAudit,
  okCommandResult,
  runSalesRecordMutation,
  salesRecordFailure,
  type SalesRecordMutationDeps,
} from "./shared";
import type { RegisterSalesRecordAttemptInput } from "./types/draft-input";

export async function registerAttempt(
  ctx: AppContext,
  deps: SalesRecordMutationDeps,
  input: RegisterSalesRecordAttemptInput,
): Promise<Result<{ success: true }, DomainError>> {
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
        "Cannot update a sales record from another branch",
      );
    }
    if (record.status !== "submitted_for_confirmation") {
      return salesRecordFailure(
        "invalid_state",
        "Attempts are only allowed while pending confirmation",
      );
    }

    await repos.salesRecords.createAttempt({
      sales_record_id: input.recordId,
      reviewer_user_id: ctx.actor.userId,
      outcome: input.outcome,
      notes: input.notes,
      next_attempt_at: input.nextAttemptAt,
      created_at: Date.now(),
    });
    await audit.log(
      ctx.actor.userId,
      "sales_record_attempt_logged",
      "sales_record",
      input.recordId,
      {
        outcome: input.outcome,
        hasNotes: input.notes !== null,
        nextAttemptAt: input.nextAttemptAt,
      },
    );
    return okCommandResult();
  });
}
