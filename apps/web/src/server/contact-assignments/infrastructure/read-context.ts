import { db } from "~/lib/db/db";
import {
  createLeadCapacityGrantsRepo,
  createLeadUsageCommitsRepo,
  createLeadUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import {
  createLeadPolicyDefaultsRepo,
  createLeadPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import { createUsersRepo } from "~/server/users/repos-users";

export function createContactAssignmentReadContext() {
  return {
    users: createUsersRepo(db),
    leadPolicyDefaults: createLeadPolicyDefaultsRepo(db),
    leadPolicyOverrides: createLeadPolicyOverridesRepo(db),
    leadCapacityGrants: createLeadCapacityGrantsRepo(db),
    leadUsageReservations: createLeadUsageReservationsRepo(db),
    leadUsageCommits: createLeadUsageCommitsRepo(db),
    contactAssignments: createContactAssignmentsRepo(db),
  };
}
