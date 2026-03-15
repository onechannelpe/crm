"use server";

import { forbiddenError, notFoundError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { leadOpsService } from "~/server/shared/context";
import { repos } from "~/server/shared/context";
import { searchAccessService } from "~/server/shared/context";
import { canManageExecutive } from "~/server/team-admin/scope";

export async function approveAllowanceRequest(
  requestId: number,
  note?: string,
) {
  const safeRequestId = assertPositiveInt(requestId, "requestId");
  const session = await requirePermission("team:manage");
  const request = await repos.allowanceRequests.findById(safeRequestId);
  if (!request) throw notFoundError("Request not found");
  const managed = await canManageExecutive(session, request.user_id, repos);
  if (!managed.ok) throw forbiddenError("Cannot approve this request");

  if (request.kind === "search_extra") {
    await searchAccessService.grantExtraAllowance(
      session.userId,
      request.user_id,
      request.requested_amount,
      note?.trim() || request.reason,
    );
  } else {
    await leadOpsService.grantExtraRefill(
      session.userId,
      request.user_id,
      request.requested_amount,
      note?.trim() || request.reason,
    );
  }

  await repos.allowanceRequests.markApproved(
    request.id,
    session.userId,
    note?.trim() || null,
  );
  return { success: true };
}

export async function rejectAllowanceRequest(requestId: number, note: string) {
  const safeRequestId = assertPositiveInt(requestId, "requestId");
  const safeNote = assertNonEmptyString(note, "note");
  const session = await requirePermission("team:manage");
  const request = await repos.allowanceRequests.findById(safeRequestId);
  if (!request) throw notFoundError("Request not found");
  const managed = await canManageExecutive(session, request.user_id, repos);
  if (!managed.ok) throw forbiddenError("Cannot reject this request");
  await repos.allowanceRequests.markRejected(
    request.id,
    session.userId,
    safeNote,
  );
  return { success: true };
}
