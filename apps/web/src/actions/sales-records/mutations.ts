"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { computeClientCompletenessScore } from "~/server/sales/completeness";
import { repos, salesRecordsService } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import {
  parseCreateSalesRecordDraftInput,
  parseRejectSalesRecordInput,
  parseSalesRecordAttemptInput,
  parseSalesRecordId,
  parseUpdateSalesRecordDraftInput,
} from "./input";
import type { CreateSalesRecordDraftInput } from "./types";

export async function createSalesRecordDraft(
  input: CreateSalesRecordDraftInput,
): Promise<{ id: number }> {
  const parsedInput = parseCreateSalesRecordDraftInput(input);
  const actor = { userId: null as number | null, role: null as Role | null };

  return runObservedAction({
    actionName: "sales_records.create_draft",
    actor,
    input: {
      source: parsedInput.source,
      addresses: parsedInput.addresses.length,
      products: parsedInput.products.length,
    },
    run: async () => {
      const session = await requirePermission("sales:create");
      actor.userId = session.userId;
      actor.role = session.role;
      await checkActionRateLimit(
        "sales_records.create_draft",
        session.userId,
        repos,
      );

      const result = await salesRecordsService.createDraft({
        source: parsedInput.source,
        executiveUserId: session.userId,
        branchId: session.branchId,
        leadAssignmentId: parsedInput.leadAssignmentId,
        client: {
          ...parsedInput.client,
          completenessScore: computeClientCompletenessScore(parsedInput.client),
        },
        addresses: parsedInput.addresses,
        products: parsedInput.products,
      });
      if (isErr(result)) throwDomainError(result.error);
      return { id: result.value };
    },
  });
}

export async function submitSalesRecord(
  recordId: number,
): Promise<ActionSuccess> {
  const safeRecordId = parseSalesRecordId(recordId);
  const actor = { userId: null as number | null, role: null as Role | null };

  return runObservedAction({
    actionName: "sales_records.submit",
    actor,
    input: { recordId: safeRecordId },
    run: async () => {
      const session = await requirePermission("sales:submit");
      actor.userId = session.userId;
      actor.role = session.role;
      await checkActionRateLimit("sales_records.submit", session.userId, repos);

      const result = await salesRecordsService.submit(
        safeRecordId,
        session.userId,
      );
      if (isErr(result)) throwDomainError(result.error);
      return { success: true };
    },
  });
}

export async function confirmSalesRecord(
  recordId: number,
): Promise<ActionSuccess> {
  const safeRecordId = parseSalesRecordId(recordId);
  const actor = { userId: null as number | null, role: null as Role | null };

  return runObservedAction({
    actionName: "sales_records.confirm",
    actor,
    input: { recordId: safeRecordId },
    run: async () => {
      const session = await requirePermission("sales:approve");
      actor.userId = session.userId;
      actor.role = session.role;

      const result = await salesRecordsService.confirm(
        safeRecordId,
        session.userId,
        session.branchId,
        session.role === "superuser",
      );
      if (isErr(result)) throwDomainError(result.error);
      return { success: true };
    },
  });
}

export async function rejectSalesRecord(
  recordId: number,
  reason: string,
): Promise<ActionSuccess> {
  const parsedInput = parseRejectSalesRecordInput(recordId, reason);
  const actor = { userId: null as number | null, role: null as Role | null };

  return runObservedAction({
    actionName: "sales_records.reject",
    actor,
    input: { recordId: parsedInput.recordId },
    run: async () => {
      const session = await requirePermission("sales:approve");
      actor.userId = session.userId;
      actor.role = session.role;

      const result = await salesRecordsService.reject(
        parsedInput.recordId,
        session.userId,
        session.branchId,
        session.role === "superuser",
        parsedInput.reason,
      );
      if (isErr(result)) throwDomainError(result.error);
      return { success: true };
    },
  });
}

export async function cancelSalesRecord(
  recordId: number,
): Promise<ActionSuccess> {
  const safeRecordId = parseSalesRecordId(recordId);
  const actor = { userId: null as number | null, role: null as Role | null };

  return runObservedAction({
    actionName: "sales_records.cancel",
    actor,
    input: { recordId: safeRecordId },
    run: async () => {
      const session = await requirePermission("sales:create");
      actor.userId = session.userId;
      actor.role = session.role;

      const result = await salesRecordsService.cancel(
        safeRecordId,
        session.userId,
      );
      if (isErr(result)) throwDomainError(result.error);
      return { success: true };
    },
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
  const actor = { userId: null as number | null, role: null as Role | null };

  return runObservedAction({
    actionName: "sales_records.update_draft",
    actor,
    input: {
      recordId: parsedInput.recordId,
      addresses: parsedInput.input.addresses.length,
      products: parsedInput.input.products.length,
      hasCorrectionNotes: parsedInput.correctionNotes !== null,
    },
    run: async () => {
      const session = await requirePermission("sales:create");
      actor.userId = session.userId;
      actor.role = session.role;

      const result = await salesRecordsService.updateDraft(
        parsedInput.recordId,
        session.userId,
        {
          ...parsedInput.input,
          client: {
            ...parsedInput.input.client,
            completenessScore: computeClientCompletenessScore(
              parsedInput.input.client,
            ),
          },
        },
        parsedInput.correctionNotes,
      );
      if (isErr(result)) throwDomainError(result.error);
      return { success: true };
    },
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
  const actor = { userId: null as number | null, role: null as Role | null };

  return runObservedAction({
    actionName: "sales_records.attempt",
    actor,
    input: { recordId: parsedInput.recordId, outcome: parsedInput.outcome },
    run: async () => {
      const session = await requirePermission("sales:approve");
      actor.userId = session.userId;
      actor.role = session.role;

      const result = await salesRecordsService.registerAttempt(
        parsedInput.recordId,
        session.userId,
        session.branchId,
        session.role === "superuser",
        parsedInput.outcome,
        parsedInput.notes,
        parsedInput.nextAttemptAt,
      );
      if (isErr(result)) throwDomainError(result.error);
      return { success: true };
    },
  });
}
