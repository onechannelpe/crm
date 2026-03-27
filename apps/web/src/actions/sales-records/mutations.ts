"use server";

import type { ActionSuccess } from "~/lib/contracts/common";
import {
  cancelRecord,
  confirmRecord,
  createDraft,
  registerAttempt,
  rejectRecord,
  submitRecord,
  updateDraft,
} from "~/server/sales-records/application/commands";
import type { CreateSalesRecordDraftInput } from "~/server/sales-records/domain/types";
import { createSalesRecordDeps } from "~/server/sales-records/infrastructure/deps";
import { runAction } from "~/server/shared/action-runtime";

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
  return runAction({
    actionName: "sales_records.create_draft",
    permission: "sales:create",
    input: {
      source: parsedInput.source,
      addresses: parsedInput.addresses.length,
      products: parsedInput.products.length,
    },
    execute: (ctx) => createDraft(ctx, createSalesRecordDeps(), parsedInput),
  });
}

export async function submitSalesRecord(
  recordId: number,
): Promise<ActionSuccess> {
  const safeRecordId = parseSalesRecordId(recordId);
  return runAction({
    actionName: "sales_records.submit",
    permission: "sales:submit",
    input: { recordId: safeRecordId },
    execute: (ctx) =>
      submitRecord(ctx, createSalesRecordDeps(), { recordId: safeRecordId }),
  });
}

export async function confirmSalesRecord(
  recordId: number,
): Promise<ActionSuccess> {
  const safeRecordId = parseSalesRecordId(recordId);
  return runAction({
    actionName: "sales_records.confirm",
    permission: "sales:approve",
    input: { recordId: safeRecordId },
    execute: (ctx) =>
      confirmRecord(ctx, createSalesRecordDeps(), { recordId: safeRecordId }),
  });
}

export async function rejectSalesRecord(
  recordId: number,
  reason: string,
): Promise<ActionSuccess> {
  const parsedInput = parseRejectSalesRecordInput(recordId, reason);
  return runAction({
    actionName: "sales_records.reject",
    permission: "sales:approve",
    input: { recordId: parsedInput.recordId },
    execute: (ctx) =>
      rejectRecord(ctx, createSalesRecordDeps(), {
        recordId: parsedInput.recordId,
        reason: parsedInput.reason,
      }),
  });
}

export async function cancelSalesRecord(
  recordId: number,
): Promise<ActionSuccess> {
  const safeRecordId = parseSalesRecordId(recordId);
  return runAction({
    actionName: "sales_records.cancel",
    permission: "sales:create",
    input: { recordId: safeRecordId },
    execute: (ctx) =>
      cancelRecord(ctx, createSalesRecordDeps(), { recordId: safeRecordId }),
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
  return runAction({
    actionName: "sales_records.update_draft",
    permission: "sales:create",
    input: {
      recordId: parsedInput.recordId,
      addresses: parsedInput.input.addresses.length,
      products: parsedInput.input.products.length,
      hasCorrectionNotes: parsedInput.correctionNotes !== null,
    },
    execute: (ctx) =>
      updateDraft(ctx, createSalesRecordDeps(), {
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
  return runAction({
    actionName: "sales_records.attempt",
    permission: "sales:approve",
    input: { recordId: parsedInput.recordId, outcome: parsedInput.outcome },
    execute: (ctx) =>
      registerAttempt(ctx, createSalesRecordDeps(), {
        recordId: parsedInput.recordId,
        outcome: parsedInput.outcome,
        notes: parsedInput.notes,
        nextAttemptAt: parsedInput.nextAttemptAt,
      }),
  });
}
