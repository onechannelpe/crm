"use server";

import { leadService } from "~/server/shared/context";
import { repos } from "~/server/shared/context";
import { requirePermission } from "~/lib/auth/session";
import { isErr } from "~/server/shared/result";
import { config } from "~/lib/config";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertPositiveInt } from "~/lib/contracts/guards";

type ActiveLead = Awaited<
  ReturnType<typeof repos.leadAssignments.findActiveByUserWithContacts>
>[number];

export interface RequestLeadsResult {
  assigned: number;
}

export async function getActiveLeads(): Promise<ActiveLead[]> {
  const session = await requirePermission("leads:read");
  return repos.leadAssignments.findActiveByUserWithContacts(session.userId);
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

  if (isErr(result)) throw new Error(result.error);
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

  if (isErr(result)) throw new Error(result.error);
  return { success: true };
}
