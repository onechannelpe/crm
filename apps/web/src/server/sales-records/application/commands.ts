import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { computeClientCompletenessScore } from "~/server/sales/completeness";
import type { AppContext } from "~/server/shared/action-runtime";
import { isErr, Ok, type Result } from "~/server/shared/result";

import type {
  SalesRecordMutationsContext,
  SalesRecordsMutationService,
} from "../infrastructure/mutations-context";
import type {
  CreateSalesRecordDraftInput,
  RegisterSalesRecordAttemptInput,
} from "./commands/types/draft-input";

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
  return Ok({ success: true as const });
}

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
  return Ok({ success: true as const });
}

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
  return Ok({ success: true as const });
}

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
  return Ok({ success: true as const });
}

export async function updateDraft(
  ctx: AppContext,
  salesRecordsService: SalesRecordsMutationService,
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
  return Ok({ success: true as const });
}
