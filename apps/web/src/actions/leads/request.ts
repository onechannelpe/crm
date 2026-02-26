"use server";

import { internalError, rateLimitError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import { config } from "~/lib/config";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertPositiveInt } from "~/lib/contracts/guards";
import type { LeadAssignmentError } from "~/server/leads/service";
import { SUPERVISOR_AUDIENCE_ROLES } from "~/server/notifications/app-events";
import { appNotificationCenter } from "~/server/shared/context";
import { leadService } from "~/server/shared/context";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

export interface RequestLeadsResult {
  assigned: number;
}

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
      throw internalError(`Unhandled lead error: ${String(exhausted)}`);
    }
  }
}

export async function requestLeads(
  bufferSize?: number,
): Promise<RequestLeadsResult> {
  const size =
    bufferSize === undefined
      ? config.leadAssignment.defaultBufferSize
      : assertPositiveInt(bufferSize, "bufferSize");
  const session = await requirePermission("leads:request");
  const result = await leadService.requestLeads(
    session.userId,
    session.branchId,
    size,
  );

  if (isErr(result)) throwLeadError(result.error);
  const requester = await repos.users.findById(session.userId);
  const supervisors = await repos.users.findActiveIdsByBranchAndRoles(
    session.branchId,
    SUPERVISOR_AUDIENCE_ROLES,
  );
  await appNotificationCenter.notifyUsers(
    supervisors.map((user) => user.id).filter((id) => id !== session.userId),
    {
      type: "lead.more_requested",
      title: "Solicitud de mas leads",
      bodyText: `${requester?.full_name ?? "Un ejecutivo"} solicito mas leads y recibio ${result.value}.`,
      actionUrl: "/sales/leads",
      priority: result.value === 0 ? "high" : "normal",
      dedupeKey: null,
      metadata: { executiveId: session.userId, assigned: result.value },
    },
  );
  return { assigned: result.value };
}

export async function completeLead(
  assignmentId: number,
): Promise<ActionSuccess> {
  const safeAssignmentId = assertPositiveInt(assignmentId, "assignmentId");
  const session = await requirePermission("leads:request");
  const result = await leadService.completeLead(
    session.userId,
    safeAssignmentId,
  );

  if (isErr(result)) throwLeadError(result.error);
  return { success: true };
}
