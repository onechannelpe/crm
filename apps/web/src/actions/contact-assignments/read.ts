"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { requirePermission } from "~/lib/auth/access/session";
import { getLeadCapacitySnapshot } from "~/server/capacity/application/get-lead-capacity-snapshot";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

type ActiveContactAssignment = Awaited<
  ReturnType<typeof repos.contactAssignments.findActiveByUserWithContacts>
>[number];

export async function getActiveContactAssignments(): Promise<
  ActiveContactAssignment[]
> {
  const session = await requirePermission("lead:work");
  return repos.contactAssignments.findActiveByUserWithContacts(session.userId);
}

export async function getMyContactAssignmentCapacity() {
  const session = await requirePermission("capacity:read:self");
  const result = await getLeadCapacitySnapshot(session.userId, repos);
  if (isErr(result)) throwDomainError(result.error);
  return result.value;
}
