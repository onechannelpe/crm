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
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";

function createCapacityRepos(executor: DatabaseExecutor) {
  return {
    users: createCapacityUsersRepo(executor),
    teams: createCapacityTeamsRepo(executor),
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
  };
}

export function createCapacityCommandsContext(executor: DatabaseExecutor) {
  return {
    repos: createCapacityRepos(executor),
    rateLimitDeps: {
      actionRateLimits: createActionRateLimitsRepo(executor),
      auditLogs: createAuditLogsRepo(executor),
    },
    runInRepositoryTransaction<T>(
      operation: (
        transactionRepos: ReturnType<typeof createCapacityRepos>,
      ) => Promise<T>,
    ) {
      return executor
        .transaction()
        .execute((transactionDb) =>
          operation(createCapacityRepos(transactionDb)),
        );
    },
  };
}

export type CapacityCommandsContext = ReturnType<
  typeof createCapacityCommandsContext
>;
export type CapacityCommandRepos = CapacityCommandsContext["repos"];
