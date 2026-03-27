"use server";

import { requirePermission } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import {
  cancelRecord,
  confirmRecord,
  createDraft,
  registerAttempt,
  rejectRecord,
  submitRecord,
  updateDraft,
} from "~/server/sales-records/service";
import type { CreateSalesRecordDraftInput } from "~/server/sales-records/types";
import { runAction } from "~/server/shared/action-runtime";
import { repos } from "~/server/shared/context";

import {
  parseCreateSalesRecordDraftInput,
  parseRejectSalesRecordInput,
  parseSalesRecordAttemptInput,
  parseSalesRecordId,
  parseUpdateSalesRecordDraftInput,
} from "./input";

export async function createSalesRecordDraft(
  input: CreateSalesRecordDraftInput,
): Promise<{ id: number }> {
  const parsedInput = parseCreateSalesRecordDraftInput(input);
  const session = await requirePermission("sales:create");
  await checkActionRateLimit(
    "sales_records.create_draft",
    session.userId,
    repos,
  );
  return runAction({
    actionName: "sales_records.create_draft",
    actor: session,
    input: {
      source: parsedInput.source,
      addresses: parsedInput.addresses.length,
      products: parsedInput.products.length,
    },
    execute: (ctx) => createDraft(ctx, parsedInput),
  });
}

export async function submitSalesRecord(
  recordId: number,
): Promise<ActionSuccess> {
  const safeRecordId = parseSalesRecordId(recordId);
  const session = await requirePermission("sales:submit");
  await checkActionRateLimit("sales_records.submit", session.userId, repos);
  return runAction({
    actionName: "sales_records.submit",
    actor: session,
    input: { recordId: safeRecordId },
    execute: (ctx) => submitRecord(ctx, { recordId: safeRecordId }),
  });
}

export async function confirmSalesRecord(
  recordId: number,
): Promise<ActionSuccess> {
  const safeRecordId = parseSalesRecordId(recordId);
  const session = await requirePermission("sales:approve");
  return runAction({
    actionName: "sales_records.confirm",
    actor: session,
    input: { recordId: safeRecordId },
    execute: (ctx) => confirmRecord(ctx, { recordId: safeRecordId }),
  });
}

export async function rejectSalesRecord(
  recordId: number,
  reason: string,
): Promise<ActionSuccess> {
  const parsedInput = parseRejectSalesRecordInput(recordId, reason);
  const session = await requirePermission("sales:approve");
  return runAction({
    actionName: "sales_records.reject",
    actor: session,
    input: { recordId: parsedInput.recordId },
    execute: (ctx) =>
      rejectRecord(ctx, {
        recordId: parsedInput.recordId,
        reason: parsedInput.reason,
      }),
  });
}

export async function cancelSalesRecord(
  recordId: number,
): Promise<ActionSuccess> {
  const safeRecordId = parseSalesRecordId(recordId);
  const session = await requirePermission("sales:create");
  return runAction({
    actionName: "sales_records.cancel",
    actor: session,
    input: { recordId: safeRecordId },
    execute: (ctx) => cancelRecord(ctx, { recordId: safeRecordId }),
  });
}

export async function updateSalesRecordDraft(
  recordId: number,
  input: Omit<CreateSalesRecordDraftInput, "source" | "leadAssignmentId">,
  correctionNotes: string | null = null,
): Promise<ActionSuccess> {
  const parsedInput = parseUpdateSalesRecordDraftInput(
    recordId,
    input,
    correctionNotes,
  );
  const session = await requirePermission("sales:create");
  return runAction({
    actionName: "sales_records.update_draft",
    actor: session,
    input: {
      recordId: parsedInput.recordId,
      addresses: parsedInput.input.addresses.length,
      products: parsedInput.input.products.length,
      hasCorrectionNotes: parsedInput.correctionNotes !== null,
    },
    execute: (ctx) =>
      updateDraft(ctx, {
        recordId: parsedInput.recordId,
        draft: parsedInput.input,
        correctionNotes: parsedInput.correctionNotes,
      }),
  });
}

export async function registerSalesRecordAttempt(
  recordId: number,
  outcome: string,
  notes: string | null = null,
  nextAttemptAt: number | null = null,
): Promise<ActionSuccess> {
  const parsedInput = parseSalesRecordAttemptInput(
    recordId,
    outcome,
    notes,
    nextAttemptAt,
  );
  const session = await requirePermission("sales:approve");
  return runAction({
    actionName: "sales_records.attempt",
    actor: session,
    input: { recordId: parsedInput.recordId, outcome: parsedInput.outcome },
    execute: (ctx) =>
      registerAttempt(ctx, {
        recordId: parsedInput.recordId,
        outcome: parsedInput.outcome,
        notes: parsedInput.notes,
        nextAttemptAt: parsedInput.nextAttemptAt,
      }),
  });
}
