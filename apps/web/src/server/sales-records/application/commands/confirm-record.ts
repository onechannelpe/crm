import type { AppContext } from "~/server/shared/action-runtime";
import { isErr } from "~/server/shared/result";

import type { SalesRecordsMutationService } from "../../infrastructure/mutations-context";
import { okCommandResult } from "./shared";

export async function confirmRecord(
  ctx: AppContext,
  salesRecordsService: SalesRecordsMutationService,
  input: { recordId: number },
) {
  const result = await salesRecordsService.confirm(
    input.recordId,
    ctx.actor.userId,
    ctx.actor.branchId,
    ctx.actor.role === "superuser",
  );
  if (isErr(result)) {
    return result;
  }
  return okCommandResult();
}
