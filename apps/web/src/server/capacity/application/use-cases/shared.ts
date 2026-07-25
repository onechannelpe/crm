import type { CapacityRequestsRepo } from "~/server/capacity/infrastructure/capacity-requests-repo";
import type { CapacityTeamsRepo } from "~/server/capacity/infrastructure/capacity-teams-repo";
import type { CapacityUsersRepo } from "~/server/capacity/infrastructure/capacity-users-repo";
import type {
  LeadPolicyDefaultsRepo,
  LeadPolicyOverridesRepo,
  SearchPolicyDefaultsRepo,
  SearchPolicyOverridesRepo,
} from "~/server/capacity/infrastructure/policy-repos";
import type {
  LeadCapacityGrantsRepo,
  SearchCapacityGrantsRepo,
} from "~/server/capacity/infrastructure/usage-repo";
import type { AppUow } from "~/server/platform/database/uow";
import type { RateLimitDeps } from "~/server/security/action-rate-limit";
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
    "insert" | "findByUserAndRange"
  >;
  leadCapacityGrants: Pick<
    LeadCapacityGrantsRepo,
    "insert" | "findByUserAndRange"
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
