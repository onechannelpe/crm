import type { AppContext } from "~/server/shared/action-runtime";
import { isErr } from "~/server/shared/result";

import type { SalesRecordsMutationService } from "../../infrastructure/mutations-context";
import { okCommandResult } from "./shared";
import type { RegisterSalesRecordAttemptInput } from "./types/draft-input";

export async function registerAttempt(
  ctx: AppContext,
  salesRecordsService: SalesRecordsMutationService,
  input: RegisterSalesRecordAttemptInput,
) {
  const result = await salesRecordsService.registerAttempt(
    input.recordId,
    ctx.actor.userId,
    ctx.actor.branchId,
    ctx.actor.role === "superuser",
    input.outcome,
    input.notes,
    input.nextAttemptAt,
  );
  if (isErr(result)) {
    return result;
  }
  return okCommandResult();
}
