import {
  createLeadCapacityGrantsRepo,
  createLeadUsageCommitsRepo,
  createLeadUsageReservationsRepo,
  createSearchCapacityGrantsRepo,
  createSearchUsageCommitsRepo,
  createSearchUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import { getAuditEvents } from "~/server/capacity/application/queries/get-audit-events";
import { getExecutiveDetail } from "~/server/capacity/application/queries/get-executive-detail";
import { getPolicyDefaults } from "~/server/capacity/application/queries/get-policy-defaults";
import { listManagedExecutives } from "~/server/capacity/application/queries/list-managed-executives";
import { listPendingRequests } from "~/server/capacity/application/queries/list-pending-requests";
import { approveCapacityRequest } from "~/server/capacity/application/use-cases/approve-capacity-request";
import { grantLeadCapacityDirect } from "~/server/capacity/application/use-cases/grant-lead-capacity-direct";
import { grantSearchCapacityDirect } from "~/server/capacity/application/use-cases/grant-search-capacity-direct";
import { rejectCapacityRequest } from "~/server/capacity/application/use-cases/reject-capacity-request";
import { requestCapacity } from "~/server/capacity/application/use-cases/request-capacity";
import { updateLeadPolicyDefault } from "~/server/capacity/application/use-cases/update-lead-policy-default";
import { updateLeadPolicyOverride } from "~/server/capacity/application/use-cases/update-lead-policy-override";
import { updateSearchPolicyDefault } from "~/server/capacity/application/use-cases/update-search-policy-default";
import { updateSearchPolicyOverride } from "~/server/capacity/application/use-cases/update-search-policy-override";
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
    useCases: {
      requestCapacity: (ctx: Parameters<typeof requestCapacity>[0], input: Parameters<typeof requestCapacity>[2]) =>
        requestCapacity(ctx, { rateLimitDeps, uow }, input),
      approveCapacityRequest: (
        ctx: Parameters<typeof approveCapacityRequest>[0],
        input: Parameters<typeof approveCapacityRequest>[2],
      ) => approveCapacityRequest(ctx, { rateLimitDeps, uow }, input),
      rejectCapacityRequest: (
        ctx: Parameters<typeof rejectCapacityRequest>[0],
        input: Parameters<typeof rejectCapacityRequest>[2],
      ) => rejectCapacityRequest(ctx, { rateLimitDeps, uow }, input),
      grantSearchCapacityDirect: (
        ctx: Parameters<typeof grantSearchCapacityDirect>[0],
        input: Parameters<typeof grantSearchCapacityDirect>[2],
      ) => grantSearchCapacityDirect(ctx, { uow }, input),
      grantLeadCapacityDirect: (
        ctx: Parameters<typeof grantLeadCapacityDirect>[0],
        input: Parameters<typeof grantLeadCapacityDirect>[2],
      ) => grantLeadCapacityDirect(ctx, { uow }, input),
      updateSearchPolicyDefault: (
        ctx: Parameters<typeof updateSearchPolicyDefault>[0],
        input: Parameters<typeof updateSearchPolicyDefault>[2],
      ) => updateSearchPolicyDefault(ctx, { uow }, input),
      updateLeadPolicyDefault: (
        ctx: Parameters<typeof updateLeadPolicyDefault>[0],
        input: Parameters<typeof updateLeadPolicyDefault>[2],
      ) => updateLeadPolicyDefault(ctx, { uow }, input),
      updateSearchPolicyOverride: (
        ctx: Parameters<typeof updateSearchPolicyOverride>[0],
        input: Parameters<typeof updateSearchPolicyOverride>[2],
      ) => updateSearchPolicyOverride(ctx, { uow }, input),
      updateLeadPolicyOverride: (
        ctx: Parameters<typeof updateLeadPolicyOverride>[0],
        input: Parameters<typeof updateLeadPolicyOverride>[2],
      ) => updateLeadPolicyOverride(ctx, { uow }, input),
      listManagedExecutives: (ctx: Parameters<typeof listManagedExecutives>[0]) =>
        listManagedExecutives(ctx, { repos: readRepos }),
      getExecutiveDetail: (
        ctx: Parameters<typeof getExecutiveDetail>[0],
        input: Parameters<typeof getExecutiveDetail>[2],
      ) => getExecutiveDetail(ctx, { repos: readRepos }, input),
      listPendingRequests: (ctx: Parameters<typeof listPendingRequests>[0]) =>
        listPendingRequests(ctx, { repos: readRepos }),
      getPolicyDefaults: (ctx: Parameters<typeof getPolicyDefaults>[0]) =>
        getPolicyDefaults(ctx, { repos: readRepos }),
      getAuditEvents: (
        ctx: Parameters<typeof getAuditEvents>[0],
        input: Parameters<typeof getAuditEvents>[2],
      ) => getAuditEvents(ctx, { repos: readRepos }, input),
    },
  };
}
