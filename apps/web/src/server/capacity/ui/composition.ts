import "server-only";
import { getExecutiveDetail } from "~/server/capacity/application/queries/get-executive-detail";
import { getPolicyDefaults } from "~/server/capacity/application/queries/get-policy-defaults";
import { listManagedExecutives } from "~/server/capacity/application/queries/list-managed-executives";
import { listPendingRequests } from "~/server/capacity/application/queries/list-pending-requests";
import { approveCapacityRequest } from "~/server/capacity/application/use-cases/approve-capacity-request";
import { grantLeadCapacityDirect } from "~/server/capacity/application/use-cases/grant-lead-capacity-direct";
import { grantSearchCapacityDirect } from "~/server/capacity/application/use-cases/grant-search-capacity-direct";
import { rejectCapacityRequest } from "~/server/capacity/application/use-cases/reject-capacity-request";
import { requestCapacity } from "~/server/capacity/application/use-cases/request-capacity";
import { updateExecutivePolicyOverride } from "~/server/capacity/application/use-cases/update-executive-policy-override";
import { updateScopePolicy } from "~/server/capacity/application/use-cases/update-scope-policy";
import { createCapacityRequestsRepo } from "~/server/capacity/infrastructure/capacity-requests-repo";
import { createCapacityTeamsRepo } from "~/server/capacity/infrastructure/capacity-teams-repo";
import { createCapacityUsersRepo } from "~/server/capacity/infrastructure/capacity-users-repo";
import {
  createLeadPolicyDefaultsRepo,
  createLeadPolicyOverridesRepo,
  createSearchPolicyDefaultsRepo,
  createSearchPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import {
  createLeadCapacityGrantsRepo,
  createLeadUsageCommitsRepo,
  createLeadUsageReservationsRepo,
  createSearchCapacityGrantsRepo,
  createSearchUsageCommitsRepo,
  createSearchUsageReservationsRepo,
} from "~/server/capacity/infrastructure/usage-repo";
import { createContactAssignmentsRepo } from "~/server/contact-assignments/infrastructure/assignment-repo";
import { createEventsRepo } from "~/server/event-logs/events-repo";
import {
  serverInfrastructure as defaultServerInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { createExecutorUow } from "~/server/platform/database/uow";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import { createBranchSupervisorsRepo } from "~/server/users/repos-branch-supervisors";

function createCapacityRepos(executor: DatabaseExecutor) {
  return {
    users: createCapacityUsersRepo(executor),
    teams: createCapacityTeamsRepo(executor),
    branchSupervisors: createBranchSupervisorsRepo(executor),
    events: createEventsRepo(executor),
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

export function createCapacityComposition(
  serverInfrastructure: ServerInfrastructure,
) {
  const readRepos = createCapacityRepos(serverInfrastructure.db);
  const uow = createExecutorUow(serverInfrastructure.db, (txDb) =>
    createCapacityRepos(txDb),
  );
  const rateLimitDeps = {
    actionRateLimits: createActionRateLimitsRepo(serverInfrastructure.db),
    events: readRepos.events,
  };

  return {
    useCases: {
      requestCapacity: (
        ctx: Parameters<typeof requestCapacity>[0],
        input: Parameters<typeof requestCapacity>[2],
      ) => requestCapacity(ctx, { rateLimitDeps, uow }, input),
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
      updateScopePolicy: (
        ctx: Parameters<typeof updateScopePolicy>[0],
        input: Parameters<typeof updateScopePolicy>[2],
      ) => updateScopePolicy(ctx, { uow }, input),
      updateExecutivePolicyOverride: (
        ctx: Parameters<typeof updateExecutivePolicyOverride>[0],
        input: Parameters<typeof updateExecutivePolicyOverride>[2],
      ) => updateExecutivePolicyOverride(ctx, { uow }, input),
      listManagedExecutives: (
        ctx: Parameters<typeof listManagedExecutives>[0],
      ) => listManagedExecutives(ctx, { repos: readRepos }),
      getExecutiveDetail: (
        ctx: Parameters<typeof getExecutiveDetail>[0],
        input: Parameters<typeof getExecutiveDetail>[2],
      ) => getExecutiveDetail(ctx, { repos: readRepos }, input),
      listPendingRequests: (ctx: Parameters<typeof listPendingRequests>[0]) =>
        listPendingRequests(ctx, { repos: readRepos }),
      getPolicyDefaults: (ctx: Parameters<typeof getPolicyDefaults>[0]) =>
        getPolicyDefaults(ctx, { repos: readRepos }),
    },
  };
}

export function composeCapacity() {
  return createCapacityComposition(defaultServerInfrastructure);
}
