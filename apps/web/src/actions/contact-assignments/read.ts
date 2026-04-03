"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { requirePermission } from "~/lib/auth/access/session";
import { db } from "~/lib/db/db";
import {
  createLeadCapacityGrantsRepo,
  createLeadUsageCommitsRepo,
  createLeadUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import { getLeadCapacitySnapshot } from "~/server/capacity/application/get-lead-capacity-snapshot";
import {
  createLeadPolicyDefaultsRepo,
  createLeadPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import { isErr } from "~/server/shared/result";
import { createUsersRepo } from "~/server/users/repos-users";

const repos = {
  users: createUsersRepo(db),
  leadPolicyDefaults: createLeadPolicyDefaultsRepo(db),
  leadPolicyOverrides: createLeadPolicyOverridesRepo(db),
  leadCapacityGrants: createLeadCapacityGrantsRepo(db),
  leadUsageReservations: createLeadUsageReservationsRepo(db),
  leadUsageCommits: createLeadUsageCommitsRepo(db),
  contactAssignments: createContactAssignmentsRepo(db),
};

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
