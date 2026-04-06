import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { computeClientCompletenessScore } from "~/server/sales/completeness";
import type { AppContext } from "~/server/shared/action-runtime";
import { isErr, Ok, type Result } from "~/server/shared/result";

import type { SalesRecordMutationsContext } from "../../infrastructure/mutations-context";
import type { CreateSalesRecordDraftInput } from "./types/draft-input";

type CreateDraftError =
  Awaited<
    ReturnType<
      SalesRecordMutationsContext["salesRecordsService"]["createDraft"]
    >
  > extends Result<any, infer E>
    ? E
    : never;

export async function createDraft(
  ctx: AppContext,
  deps: SalesRecordMutationsContext,
  input: CreateSalesRecordDraftInput,
): Promise<Result<{ id: number }, CreateDraftError>> {
  await checkActionRateLimit(
    "sales_records.create_draft",
    ctx.actor.userId,
    deps.rateLimitDeps,
  );
  const result = await deps.salesRecordsService.createDraft({
    source: input.source,
    executiveUserId: ctx.actor.userId,
    branchId: ctx.actor.branchId,
    leadAssignmentId: input.leadAssignmentId,
    client: {
      ...input.client,
      completenessScore: computeClientCompletenessScore(input.client),
    },
    addresses: input.addresses,
    products: input.products,
  });
  if (isErr(result)) {
    return result;
  }
  return Ok({ id: result.value });
}
