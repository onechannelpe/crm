import type { RateLimitDeps } from "~/lib/security/action-rate-limit";
import type {
  LeadCapacityGrantsRepo,
  SearchCapacityGrantsRepo,
} from "~/server/capacity-usage/repos";
import type { CapacityRequestsRepo } from "~/server/capacity/infrastructure/capacity-requests-repo";
import type { CapacityTeamsRepo } from "~/server/capacity/infrastructure/capacity-teams-repo";
import type { CapacityUsersRepo } from "~/server/capacity/infrastructure/capacity-users-repo";
import type {
  LeadPolicyDefaultsRepo,
  LeadPolicyOverridesRepo,
  SearchPolicyDefaultsRepo,
  SearchPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import type { AppUow } from "~/server/shared/application/uow";
import type { BranchSupervisorsRepo } from "~/server/users/repos-branch-supervisors";

export type CapacityRequestTx = {
  capacityRequests: Pick<
    CapacityRequestsRepo,
    "findById" | "markApproved" | "markRejected"
  >;
};

export type CapacityRequestCreateTx = {
  capacityRequests: Pick<CapacityRequestsRepo, "create">;
};

export type CapacityManageTx = {
  users: Pick<CapacityUsersRepo, "findById">;
};

export type CapacityGrantTx = {
  searchCapacityGrants: Pick<
    SearchCapacityGrantsRepo,
    "insert" | "findByUserAndPeriod"
  >;
  leadCapacityGrants: Pick<
    LeadCapacityGrantsRepo,
    "insert" | "findByUserAndDate"
  >;
};

export type CapacityPolicyTx = {
  teams: Pick<CapacityTeamsRepo, "findById">;
  branchSupervisors: Pick<BranchSupervisorsRepo, "isSupervisor">;
  searchPolicyDefaults: Pick<SearchPolicyDefaultsRepo, "upsert">;
  leadPolicyDefaults: Pick<LeadPolicyDefaultsRepo, "upsert">;
  searchPolicyOverrides: Pick<SearchPolicyOverridesRepo, "replaceForUser">;
  leadPolicyOverrides: Pick<LeadPolicyOverridesRepo, "replaceForUser">;
};

export type CapacityApprovalDeps = {
  rateLimitDeps: RateLimitDeps;
  uow: AppUow<CapacityRequestTx & CapacityManageTx & CapacityGrantTx>;
};

export type CapacityGrantDeps = {
  uow: AppUow<CapacityManageTx & CapacityGrantTx>;
};

export type CapacityPolicyDeps = {
  uow: AppUow<CapacityManageTx & CapacityPolicyTx>;
};

export type CapacityRequestDeps = {
  rateLimitDeps: RateLimitDeps;
  uow: AppUow<CapacityRequestCreateTx>;
};
