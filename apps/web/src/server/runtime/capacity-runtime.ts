import {
  createLeadCapacityGrantsRepo,
  createLeadUsageCommitsRepo,
  createLeadUsageReservationsRepo,
  createSearchCapacityGrantsRepo,
  createSearchUsageCommitsRepo,
  createSearchUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import { bindCapacityIntentHandlers } from "~/server/capacity/application/use-cases";
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

import type { ServerInfra } from "./infra";

function createCapacityRepos(executor: DatabaseExecutor) {
  return {
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
  };
}

export function createCapacityRuntime(infra: ServerInfra) {
  const readRepos = createCapacityRepos(infra.db);
  const uow = createExecutorUow(infra.db, (txDb) => createCapacityRepos(txDb));
  const rateLimitDeps = {
    actionRateLimits: createActionRateLimitsRepo(infra.db),
    auditLogs: readRepos.auditLogs,
  };

  return {
    useCases: bindCapacityIntentHandlers({
      requestCapacity: { rateLimitDeps, uow },
      approveCapacityRequest: { rateLimitDeps, uow },
      rejectCapacityRequest: { rateLimitDeps, uow },
      grantSearchCapacityDirect: { uow },
      grantLeadCapacityDirect: { uow },
      updateSearchPolicyDefault: { uow },
      updateLeadPolicyDefault: { uow },
      updateSearchPolicyOverride: { uow },
      updateLeadPolicyOverride: { uow },
      listManagedExecutives: { repos: readRepos },
      getExecutiveDetail: { repos: readRepos },
      listPendingRequests: { repos: readRepos },
      getPolicyDefaults: { repos: readRepos },
      getAuditEvents: { repos: readRepos },
    }),
  };
}
