import type { BranchId, UserId } from "~/server/shared/ids";

export type LeadUser = {
  id: UserId;
  isActive: boolean;
};

export type LeadUserWithName = {
  id: UserId;
  fullName: string;
};

export type AssignableExecutivesScope = {
  actorRole: "superuser" | "admin" | "sales_manager" | "supervisor";
  actorBranchId: BranchId;
};

export type LeadUserScopeRepository = {
  findUserById(id: UserId): Promise<LeadUser | undefined>;
  isExecutiveAssignable(
    scope: AssignableExecutivesScope,
    executiveId: UserId,
  ): Promise<boolean>;
  listAssignableExecutives(
    scope: AssignableExecutivesScope,
    options?: { search?: string; limit?: number },
  ): Promise<LeadUserWithName[]>;
};
