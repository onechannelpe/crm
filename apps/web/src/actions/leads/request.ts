"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { config } from "~/lib/config";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { shortName } from "~/lib/users/display-name";
import { SUPERVISOR_AUDIENCE_ROLES } from "~/server/notifications/app-events";
import { appNotificationCenter } from "~/server/shared/context";
import { leadService } from "~/server/shared/context";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { throwLeadError } from "./error-mapping";

export interface RequestLeadsResult {
  assigned: number;
}

export async function requestLeads(
  bufferSize?: number,
): Promise<RequestLeadsResult> {
  const size =
    bufferSize === undefined
      ? config.leadAssignment.defaultBufferSize
      : assertPositiveInt(bufferSize, "bufferSize");
  const session = await requirePermission("leads:request");
  await checkActionRateLimit("leads.request", session.userId, repos);
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
      bodyText: `${requester ? shortName(requester) : "Un ejecutivo"} solicitó mas leads y recibió ${result.value}.`,
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
