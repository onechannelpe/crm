"use server";

import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { getPendingReviewNotesForSession } from "~/server/sales/pending-review";
import { repos, salesService } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import type {
  ApprovedSaleNote,
  PendingReviewNote,
  RejectSaleInput,
} from "./types";

export async function submitSale(noteId: number): Promise<ActionSuccess> {
  const safeNoteId = assertPositiveInt(noteId, "noteId");
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales.submit",
    actor,
    input: { noteId: safeNoteId },
    run: async () => {
      const session = await requirePermission("sales:submit");
      actor.userId = session.userId;
      actor.role = session.role;
      const result = await salesService.submit(safeNoteId, session.userId);
      if (isErr(result)) throw new Error(result.error);
      return { success: true };
    },
  });
}

export async function approveSale(noteId: number): Promise<ActionSuccess> {
  const safeNoteId = assertPositiveInt(noteId, "noteId");
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales.approve",
    actor,
    input: { noteId: safeNoteId },
    run: async () => {
      const session = await requirePermission("sales:approve");
      actor.userId = session.userId;
      actor.role = session.role;
      const result = await salesService.approve(
        safeNoteId,
        session.userId,
        session.branchId,
        session.role === "superuser",
      );
      if (isErr(result)) throw new Error(result.error);
      return { success: true };
    },
  });
}

export async function rejectSale(
  noteId: number,
  rejections: RejectSaleInput[],
): Promise<ActionSuccess> {
  const safeNoteId = assertPositiveInt(noteId, "noteId");
  if (rejections.length === 0) {
    throw new Error("rejections must contain at least one item");
  }
  const normalizedRejections = rejections.map((item) => ({
    field_id: assertNonEmptyString(item.field_id, "rejections.field_id"),
    reviewer_note:
      item.reviewer_note === null
        ? null
        : assertNonEmptyString(item.reviewer_note, "rejections.reviewer_note"),
  }));
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "sales.reject",
    actor,
    input: { noteId: safeNoteId, rejectionsCount: normalizedRejections.length },
    run: async () => {
      const session = await requirePermission("sales:approve");
      actor.userId = session.userId;
      actor.role = session.role;
      const result = await salesService.reject(
        safeNoteId,
        session.userId,
        session.branchId,
        session.role === "superuser",
        normalizedRejections,
      );
      if (isErr(result)) throw new Error(result.error);
      return { success: true };
    },
  });
}

export async function getPendingReviewNotes(): Promise<PendingReviewNote[]> {
  const session = await requirePermission("sales:review");
  return getPendingReviewNotesForSession(
    { repos },
    { role: session.role, branchId: session.branchId },
  );
}

export async function getApprovedSales(): Promise<ApprovedSaleNote[]> {
  const session = await requirePermission("sales:review");
  if (session.role === "executive") {
    return repos.chargeNotes.findApprovedWithContactsByUser(session.userId);
  }
  return repos.chargeNotes.findApprovedWithContacts();
}
