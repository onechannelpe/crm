import type { AppContext } from "~/server/shared/action-runtime";
import { isErr } from "~/server/shared/result";

import type { SalesRecordsMutationService } from "../../infrastructure/mutations-context";
import { okCommandResult } from "./shared";

export async function cancelRecord(
  ctx: AppContext,
  salesRecordsService: SalesRecordsMutationService,
  input: { recordId: number },
) {
  const result = await salesRecordsService.cancel(
    input.recordId,
    ctx.actor.userId,
  );
  if (isErr(result)) {
    return result;
  }
  return okCommandResult();
}
