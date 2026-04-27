import {
  createLeadCapacityGrantsRepo,
  createLeadUsageCommitsRepo,
  createLeadUsageReservationsRepo,
  createSearchCapacityGrantsRepo,
  createSearchUsageCommitsRepo,
  createSearchUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import { createCapacityRequestsRepo } from "~/server/capacity/infrastructure/capacity-requests-repo";
import { createCapacityTeamsRepo } from "~/server/capacity/infrastructure/capacity-teams-repo";
import { createCapacityUsersRepo } from "~/server/capacity/infrastructure/capacity-users-repo";
import {
  createLeadPolicyDefaultsRepo,
  createLeadPolicyOverridesRepo,
  createSearchPolicyDefaultsRepo,
  createSearchPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createBranchSupervisorsRepo } from "~/server/users/repos-branch-supervisors";

export function createCapacityReadContext(executor: DatabaseExecutor) {
  return {
    repos: {
      users: createCapacityUsersRepo(executor),
      teams: createCapacityTeamsRepo(executor),
      branchSupervisors: createBranchSupervisorsRepo(executor),
      auditLogs: createAuditLogsRepo(executor),
      capacityRequests: createCapacityRequestsRepo(executor),
      searchPolicyDefaults: createSearchPolicyDefaultsRepo(executor),
      searchPolicyOverrides: createSearchPolicyOverridesRepo(executor),
      leadPolicyDefaults: createLeadPolicyDefaultsRepo(executor),
      leadPolicyOverrides: createLeadPolicyOverridesRepo(executor),
      searchCapacityGrants: createSearchCapacityGrantsRepo(executor),
      searchUsageReservations: createSearchUsageReservationsRepo(executor),
      searchUsageCommits: createSearchUsageCommitsRepo(executor),
      leadCapacityGrants: createLeadCapacityGrantsRepo(executor),
      leadUsageReservations: createLeadUsageReservationsRepo(executor),
      leadUsageCommits: createLeadUsageCommitsRepo(executor),
      contactAssignments: createContactAssignmentsRepo(executor),
    },
  };
}

export type CapacityReadContext = ReturnType<typeof createCapacityReadContext>;
