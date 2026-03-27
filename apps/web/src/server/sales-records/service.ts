import { computeClientCompletenessScore } from "~/server/sales/completeness";
import type { AppContext } from "~/server/shared/action-runtime";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { rateLimitDeps, salesRecordsService } from "~/server/shared/context";
import { isErr, Ok, type Result } from "~/server/shared/result";

import type {
  CreateSalesRecordDraftInput,
  SalesRecordAttemptOutcome,
} from "./types";

export async function createDraft(
  ctx: AppContext,
  input: CreateSalesRecordDraftInput,
): Promise<
  Result<
    { id: number },
    Awaited<ReturnType<typeof salesRecordsService.createDraft>> extends Result<
      any,
      infer E
    >
      ? E
      : never
  >
> {
  await checkActionRateLimit(
    "sales_records.create_draft",
    ctx.actor.userId,
    rateLimitDeps,
  );
  const result = await salesRecordsService.createDraft({
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
  input: { recordId: number },
) {
  await checkActionRateLimit("sales_records.submit", ctx.actor.userId, rateLimitDeps);
  const result = await salesRecordsService.submit(
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
  return Ok({ success: true as const });
}

export async function rejectRecord(
  ctx: AppContext,
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
  return Ok({ success: true as const });
}

export async function cancelRecord(
  ctx: AppContext,
  input: { recordId: number },
) {
  const result = await salesRecordsService.cancel(
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
  input: {
    recordId: number;
    draft: Omit<CreateSalesRecordDraftInput, "source" | "leadAssignmentId">;
    correctionNotes: string | null;
  },
) {
  const result = await salesRecordsService.updateDraft(
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
  input: {
    recordId: number;
    outcome: SalesRecordAttemptOutcome;
    notes: string | null;
    nextAttemptAt: number | null;
  },
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
  return Ok({ success: true as const });
}
