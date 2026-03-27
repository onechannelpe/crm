import {
  repos,
  rateLimitDeps,
  runInRepositoryTransaction,
} from "~/server/shared/context";

export { rateLimitDeps, runInRepositoryTransaction };

export const capacityRepos = {
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
};
