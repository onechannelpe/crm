import { db } from "~/lib/db/db";
import {
  createLeadCapacityGrantsRepo,
  createLeadUsageCommitsRepo,
  createLeadUsageReservationsRepo,
  createSearchCapacityGrantsRepo,
  createSearchUsageCommitsRepo,
  createSearchUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import { createCapacityRequestsRepo } from "~/server/capacity/infrastructure/capacity-requests-repo";
import {
  createLeadPolicyDefaultsRepo,
  createLeadPolicyOverridesRepo,
  createSearchPolicyDefaultsRepo,
  createSearchPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUsersRepo } from "~/server/users/repos-users";

export function createCapacityReadContext() {
  return {
    repos: {
      users: createUsersRepo(db),
      teams: createTeamsRepo(db),
      auditLogs: createAuditLogsRepo(db),
      capacityRequests: createCapacityRequestsRepo(db),
      searchPolicyDefaults: createSearchPolicyDefaultsRepo(db),
      searchPolicyOverrides: createSearchPolicyOverridesRepo(db),
      leadPolicyDefaults: createLeadPolicyDefaultsRepo(db),
      leadPolicyOverrides: createLeadPolicyOverridesRepo(db),
      searchCapacityGrants: createSearchCapacityGrantsRepo(db),
      searchUsageReservations: createSearchUsageReservationsRepo(db),
      searchUsageCommits: createSearchUsageCommitsRepo(db),
      leadCapacityGrants: createLeadCapacityGrantsRepo(db),
      leadUsageReservations: createLeadUsageReservationsRepo(db),
      leadUsageCommits: createLeadUsageCommitsRepo(db),
      contactAssignments: createContactAssignmentsRepo(db),
    },
  };
}

export type CapacityReadContext = ReturnType<typeof createCapacityReadContext>;
