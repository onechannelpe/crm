"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { requirePermission } from "~/lib/auth/access/session";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";
import { getLeadCapacityForUser } from "~/server/lead-workflow/read-lead-capacity";

type ActiveLead = Awaited<
  ReturnType<typeof repos.leadAssignments.findActiveByUserWithContacts>
>[number];

export async function getActiveLeads(): Promise<ActiveLead[]> {
  const session = await requirePermission("lead:work");
  return repos.leadAssignments.findActiveByUserWithContacts(session.userId);
}

export async function getMyLeadCapacity() {
  const session = await requirePermission("capacity:read:self");
  const result = await getLeadCapacityForUser(session.userId, repos);
  if (isErr(result)) throwDomainError(result.error);
  return result.value;
}
