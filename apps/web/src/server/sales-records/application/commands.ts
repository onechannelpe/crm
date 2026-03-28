import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { computeClientCompletenessScore } from "~/server/sales/completeness";
import type { AppContext } from "~/server/shared/action-runtime";
import { isErr, Ok, type Result } from "~/server/shared/result";

import type {
  CreateSalesRecordDraftInput,
  SalesRecordAttemptOutcome,
} from "../domain/types";
import type { SalesRecordDeps } from "../infrastructure/deps";

type CreateDraftError =
  Awaited<
    ReturnType<SalesRecordDeps["salesRecordsService"]["createDraft"]>
  > extends Result<any, infer E>
    ? E
    : never;

export async function createDraft(
  ctx: AppContext,
  deps: Pick<SalesRecordDeps, "rateLimitDeps" | "salesRecordsService">,
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

export async function submitRecord(
  ctx: AppContext,
  deps: Pick<SalesRecordDeps, "rateLimitDeps" | "salesRecordsService">,
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
  return Ok({ success: true as const });
}

export async function confirmRecord(
  ctx: AppContext,
  deps: Pick<SalesRecordDeps, "salesRecordsService">,
  input: { recordId: number },
) {
  const result = await deps.salesRecordsService.confirm(
    input.recordId,
    ctx.actor.userId,
    ctx.actor.branchId,
    ctx.actor.role === "superuser",
  );
  if (isErr(result)) {
    return result;
  }
  return Ok({ success: true as const });
}

export async function rejectRecord(
  ctx: AppContext,
  deps: Pick<SalesRecordDeps, "salesRecordsService">,
  input: { recordId: number; reason: string },
) {
  const result = await deps.salesRecordsService.reject(
    input.recordId,
    ctx.actor.userId,
    ctx.actor.branchId,
    ctx.actor.role === "superuser",
    input.reason,
  );
  if (isErr(result)) {
    return result;
  }
  return Ok({ success: true as const });
}

export async function cancelRecord(
  ctx: AppContext,
  deps: Pick<SalesRecordDeps, "salesRecordsService">,
  input: { recordId: number },
) {
  const result = await deps.salesRecordsService.cancel(
    input.recordId,
    ctx.actor.userId,
  );
  if (isErr(result)) {
    return result;
  }
  return Ok({ success: true as const });
}

export async function updateDraft(
  ctx: AppContext,
  deps: Pick<SalesRecordDeps, "salesRecordsService">,
  input: {
    recordId: number;
    draft: Omit<CreateSalesRecordDraftInput, "source" | "leadAssignmentId">;
    correctionNotes: string | null;
  },
) {
  const result = await deps.salesRecordsService.updateDraft(
    input.recordId,
    ctx.actor.userId,
    {
      ...input.draft,
      client: {
        ...input.draft.client,
        completenessScore: computeClientCompletenessScore(input.draft.client),
      },
    },
    input.correctionNotes,
  );
  if (isErr(result)) {
    return result;
  }
  return Ok({ success: true as const });
}

export async function registerAttempt(
  ctx: AppContext,
  deps: Pick<SalesRecordDeps, "salesRecordsService">,
  input: {
    recordId: number;
    outcome: SalesRecordAttemptOutcome;
    notes: string | null;
    nextAttemptAt: number | null;
  },
) {
  const result = await deps.salesRecordsService.registerAttempt(
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
  return Ok({ success: true as const });
}
