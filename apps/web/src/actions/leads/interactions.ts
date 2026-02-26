"use server";

import { internalError, rateLimitError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertPositiveInt } from "~/lib/contracts/guards";
import type { LeadAssignmentError } from "~/server/leads/service";
import { leadService } from "~/server/shared/context";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

function throwLeadError(error: LeadAssignmentError): never {
  switch (error.reason) {
    case "engine_unavailable":
    case "unexpected":
      throw internalError(error.message);
    case "quota_error":
      switch (error.quotaError.reason) {
        case "quota_exhausted":
          throw rateLimitError(error.quotaError.message);
        case "quota_not_allocated":
        case "quota_already_allocated":
        case "invalid_refund_amount":
        case "unexpected":
          throw internalError(error.quotaError.message);
        default: {
          const exhausted: never = error.quotaError;
          throw internalError(`Unhandled quota error: ${String(exhausted)}`);
        }
      }
    default: {
      const exhausted: never = error;
      throw internalError(
        `Unhandled lead interaction error: ${String(exhausted)}`,
      );
    }
  }
}

export async function registerCall(
  assignmentId: number,
  contactId: number,
  outcome: string,
  notes?: string,
): Promise<ActionSuccess> {
  const safeAssignmentId = assertPositiveInt(assignmentId, "assignmentId");
  const safeContactId = assertPositiveInt(contactId, "contactId");
  const session = await requirePermission("leads:read");

  await repos.interactionLogs.create({
    contact_id: safeContactId,
    user_id: session.userId,
    outcome: outcome,
    notes: notes || null,
    duration_seconds: null,
    created_at: Date.now(),
  });

  const result = await leadService.completeLead(
    session.userId,
    safeAssignmentId,
  );

  if (isErr(result)) throwLeadError(result.error);
  return { success: true };
}
