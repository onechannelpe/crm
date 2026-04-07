"use server";

import type { ActionSuccess } from "~/lib/contracts/common";
import { cancelRecord } from "~/server/sales-records/application/commands/cancel-record";
import { confirmRecord } from "~/server/sales-records/application/commands/confirm-record";
import { createDraft } from "~/server/sales-records/application/commands/create-draft";
import { registerAttempt } from "~/server/sales-records/application/commands/register-attempt";
import { rejectRecord } from "~/server/sales-records/application/commands/reject-record";
import { submitRecord } from "~/server/sales-records/application/commands/submit-draft";
import type { CreateSalesRecordDraftInput } from "~/server/sales-records/application/commands/types/draft-input";
import type { SalesRecordDraftCreatedResult } from "~/server/sales-records/application/commands/types/results";
import { updateDraft } from "~/server/sales-records/application/commands/update-draft";
import { createSalesRecordMutationsContext } from "~/server/sales-records/infrastructure/mutations-context";
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
): Promise<SalesRecordDraftCreatedResult> {
  const parsedInput = parseCreateSalesRecordDraftInput(input);
  return runAction({
    actionName: "sales_records.create_draft",
    permission: "sales:create",
    input: {
      source: parsedInput.source,
      addresses: parsedInput.addresses.length,
      products: parsedInput.products.length,
    },
    execute: (ctx) =>
      createDraft(ctx, createSalesRecordMutationsContext(), parsedInput),
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
      submitRecord(ctx, createSalesRecordMutationsContext(), {
        recordId: safeRecordId,
      }),
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
      confirmRecord(ctx, createSalesRecordMutationsContext(), {
        recordId: safeRecordId,
      }),
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
      rejectRecord(ctx, createSalesRecordMutationsContext(), {
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
      cancelRecord(ctx, createSalesRecordMutationsContext(), {
        recordId: safeRecordId,
      }),
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
      updateDraft(ctx, createSalesRecordMutationsContext(), {
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
      registerAttempt(ctx, createSalesRecordMutationsContext(), {
        recordId: parsedInput.recordId,
        outcome: parsedInput.outcome,
        notes: parsedInput.notes,
        nextAttemptAt: parsedInput.nextAttemptAt,
      }),
  });
}
