import type { AppContext } from "~/server/shared/action-runtime";
import { isErr } from "~/server/shared/result";

import type { SalesRecordsMutationService } from "../../infrastructure/mutations-context";
import { okCommandResult } from "./shared";

export async function rejectRecord(
  ctx: AppContext,
  salesRecordsService: SalesRecordsMutationService,
  input: { recordId: number; reason: string },
) {
  const result = await salesRecordsService.reject(
    input.recordId,
    ctx.actor.userId,
    ctx.actor.branchId,
    ctx.actor.role === "superuser",
    input.reason,
  );
  if (isErr(result)) {
    return result;
  }
  return okCommandResult();
}
