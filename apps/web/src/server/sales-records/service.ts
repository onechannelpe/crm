import { computeClientCompletenessScore } from "~/server/sales/completeness";
import type { AppContext } from "~/server/shared/action-runtime";
import { salesRecordsService } from "~/server/shared/context";

import type { CreateSalesRecordDraftInput } from "./types";

export function createDraft(ctx: AppContext, input: CreateSalesRecordDraftInput) {
  return salesRecordsService.createDraft({
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
}

export function submitRecord(ctx: AppContext, input: { recordId: number }) {
  return salesRecordsService.submit(input.recordId, ctx.actor.userId);
}

export function confirmRecord(ctx: AppContext, input: { recordId: number }) {
  return salesRecordsService.confirm(
    input.recordId,
    ctx.actor.userId,
    ctx.actor.branchId,
    ctx.actor.role === "superuser",
  );
}

export function rejectRecord(
  ctx: AppContext,
  input: { recordId: number; reason: string },
) {
  return salesRecordsService.reject(
    input.recordId,
    ctx.actor.userId,
    ctx.actor.branchId,
    ctx.actor.role === "superuser",
    input.reason,
  );
}

export function cancelRecord(ctx: AppContext, input: { recordId: number }) {
  return salesRecordsService.cancel(input.recordId, ctx.actor.userId);
}

export function updateDraft(
  ctx: AppContext,
  input: {
    recordId: number;
    draft: Omit<CreateSalesRecordDraftInput, "source" | "leadAssignmentId">;
    correctionNotes: string | null;
  },
) {
  return salesRecordsService.updateDraft(
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
}

export function registerAttempt(
  ctx: AppContext,
  input: {
    recordId: number;
    outcome: string;
    notes: string | null;
    nextAttemptAt: number | null;
  },
) {
  return salesRecordsService.registerAttempt(
    input.recordId,
    ctx.actor.userId,
    ctx.actor.branchId,
    ctx.actor.role === "superuser",
    input.outcome,
    input.notes,
    input.nextAttemptAt,
  );
}
