import { repos } from "~/server/shared/context";

export function createCapacityReadContext() {
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
      leadAssignments: repos.leadAssignments,
    },
  };
}

export type CapacityReadContext = ReturnType<typeof createCapacityReadContext>;
