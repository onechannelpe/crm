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
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createTeamsRepo } from "~/server/users/repos-teams";
import { createUsersRepo } from "~/server/users/repos-users";

function createCapacityRepos(executor: DatabaseExecutor) {
  return {
    users: createUsersRepo(executor),
    teams: createTeamsRepo(executor),
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

export function createCapacityCommandsContext() {
  return {
    repos: createCapacityRepos(db),
    rateLimitDeps: {
      actionRateLimits: createActionRateLimitsRepo(db),
      auditLogs: createAuditLogsRepo(db),
    },
    runInRepositoryTransaction<T>(
      operation: (
        transactionRepos: ReturnType<typeof createCapacityRepos>,
      ) => Promise<T>,
    ) {
      return db
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
