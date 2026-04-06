import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import type { AppContext } from "~/server/shared/action-runtime";
import { isErr } from "~/server/shared/result";

import type { SalesRecordMutationsContext } from "../../infrastructure/mutations-context";
import { okCommandResult } from "./shared";

export async function submitRecord(
  ctx: AppContext,
  deps: SalesRecordMutationsContext,
  input: { recordId: number },
) {
  await checkActionRateLimit(
    "sales_records.submit",
    ctx.actor.userId,
    deps.rateLimitDeps,
  );
  const result = await deps.salesRecordsService.submit(
    input.recordId,
    ctx.actor.userId,
  );
  if (isErr(result)) {
    return result;
  }
  return okCommandResult();
}
