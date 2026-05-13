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
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import { createExecutorUow } from "~/server/shared/application/uow";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createBranchSupervisorsRepo } from "~/server/users/repos-branch-supervisors";

export type CapacityRepos = {
  users: ReturnType<typeof createCapacityUsersRepo>;
  teams: ReturnType<typeof createCapacityTeamsRepo>;
  branchSupervisors: ReturnType<typeof createBranchSupervisorsRepo>;
  auditLogs: ReturnType<typeof createAuditLogsRepo>;
  capacityRequests: ReturnType<typeof createCapacityRequestsRepo>;
  searchPolicyDefaults: ReturnType<typeof createSearchPolicyDefaultsRepo>;
  searchPolicyOverrides: ReturnType<typeof createSearchPolicyOverridesRepo>;
  leadPolicyDefaults: ReturnType<typeof createLeadPolicyDefaultsRepo>;
  leadPolicyOverrides: ReturnType<typeof createLeadPolicyOverridesRepo>;
  searchCapacityGrants: ReturnType<typeof createSearchCapacityGrantsRepo>;
  searchUsageReservations: ReturnType<typeof createSearchUsageReservationsRepo>;
  searchUsageCommits: ReturnType<typeof createSearchUsageCommitsRepo>;
  leadCapacityGrants: ReturnType<typeof createLeadCapacityGrantsRepo>;
  leadUsageReservations: ReturnType<typeof createLeadUsageReservationsRepo>;
  leadUsageCommits: ReturnType<typeof createLeadUsageCommitsRepo>;
  contactAssignments: ReturnType<typeof createContactAssignmentsRepo>;
};

export function createCapacityCommandsContext(executor: DatabaseExecutor) {
  return {
    rateLimitDeps: {
      actionRateLimits: createActionRateLimitsRepo(executor),
      auditLogs: createAuditLogsRepo(executor),
    },
    uow: createExecutorUow(
      executor,
      (txDb): CapacityRepos => ({
        users: createCapacityUsersRepo(txDb),
        teams: createCapacityTeamsRepo(txDb),
        branchSupervisors: createBranchSupervisorsRepo(txDb),
        auditLogs: createAuditLogsRepo(txDb),
        capacityRequests: createCapacityRequestsRepo(txDb),
        searchPolicyDefaults: createSearchPolicyDefaultsRepo(txDb),
        searchPolicyOverrides: createSearchPolicyOverridesRepo(txDb),
        leadPolicyDefaults: createLeadPolicyDefaultsRepo(txDb),
        leadPolicyOverrides: createLeadPolicyOverridesRepo(txDb),
        searchCapacityGrants: createSearchCapacityGrantsRepo(txDb),
        searchUsageReservations: createSearchUsageReservationsRepo(txDb),
        searchUsageCommits: createSearchUsageCommitsRepo(txDb),
        leadCapacityGrants: createLeadCapacityGrantsRepo(txDb),
        leadUsageReservations: createLeadUsageReservationsRepo(txDb),
        leadUsageCommits: createLeadUsageCommitsRepo(txDb),
        contactAssignments: createContactAssignmentsRepo(txDb),
      }),
    ),
  };
}

export type CapacityCommandsContext = ReturnType<
  typeof createCapacityCommandsContext
>;
