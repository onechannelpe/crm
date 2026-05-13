import {
  createLeadCapacityGrantsRepo,
  createLeadUsageCommitsRepo,
  createLeadUsageReservationsRepo,
  createSearchCapacityGrantsRepo,
  createSearchUsageCommitsRepo,
  createSearchUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import { createCapacityUseCases } from "~/server/capacity/application/use-cases";
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
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";
import { createBranchSupervisorsRepo } from "~/server/users/repos-branch-supervisors";

import type { ServerInfra } from "./infra";

export function createCapacityRuntime(infra: ServerInfra) {
  const readRepos = {
    users: createCapacityUsersRepo(infra.db),
    teams: createCapacityTeamsRepo(infra.db),
    branchSupervisors: createBranchSupervisorsRepo(infra.db),
    auditLogs: createAuditLogsRepo(infra.db),
    capacityRequests: createCapacityRequestsRepo(infra.db),
    searchPolicyDefaults: createSearchPolicyDefaultsRepo(infra.db),
    searchPolicyOverrides: createSearchPolicyOverridesRepo(infra.db),
    leadPolicyDefaults: createLeadPolicyDefaultsRepo(infra.db),
    leadPolicyOverrides: createLeadPolicyOverridesRepo(infra.db),
    searchCapacityGrants: createSearchCapacityGrantsRepo(infra.db),
    searchUsageReservations: createSearchUsageReservationsRepo(infra.db),
    searchUsageCommits: createSearchUsageCommitsRepo(infra.db),
    leadCapacityGrants: createLeadCapacityGrantsRepo(infra.db),
    leadUsageReservations: createLeadUsageReservationsRepo(infra.db),
    leadUsageCommits: createLeadUsageCommitsRepo(infra.db),
    contactAssignments: createContactAssignmentsRepo(infra.db),
  };

  const useCases = createCapacityUseCases({
    rateLimitDeps: {
      actionRateLimits: createActionRateLimitsRepo(infra.db),
      auditLogs: readRepos.auditLogs,
    },
    readRepos,
    uow: createExecutorUow(infra.db, (txDb) => ({
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
    })),
  });

  return {
    useCases,
  };
}
