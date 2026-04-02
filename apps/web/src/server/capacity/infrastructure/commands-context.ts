import {
  rateLimitDeps,
  repos,
  runInRepositoryTransaction,
} from "~/server/shared/context";

export function createCapacityCommandsContext() {
  return {
    repos: {
      users: repos.users,
      teams: repos.teams,
      auditLogs: repos.auditLogs,
      capacityRequests: repos.capacityRequests,
      searchPolicyDefaults: repos.searchPolicyDefaults,
      searchPolicyOverrides: repos.searchPolicyOverrides,
      leadPolicyDefaults: repos.leadPolicyDefaults,
      leadPolicyOverrides: repos.leadPolicyOverrides,
      searchCapacityGrants: repos.searchCapacityGrants,
      searchUsageReservations: repos.searchUsageReservations,
      searchUsageCommits: repos.searchUsageCommits,
      leadCapacityGrants: repos.leadCapacityGrants,
      leadUsageReservations: repos.leadUsageReservations,
      leadUsageCommits: repos.leadUsageCommits,
      contactAssignments: repos.contactAssignments,
    },
    rateLimitDeps,
    runInRepositoryTransaction,
  };
}

export type CapacityCommandsContext = ReturnType<
  typeof createCapacityCommandsContext
>;
export type CapacityCommandRepos = CapacityCommandsContext["repos"];
