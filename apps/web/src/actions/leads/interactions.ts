"use server";

import { requirePermission } from "~/lib/auth/access/session";
import type { ActionSuccess } from "~/lib/contracts/common";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { leadService } from "~/server/shared/context";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { throwLeadError } from "./error-mapping";

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
