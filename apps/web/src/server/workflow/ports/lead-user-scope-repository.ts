export type LeadUser = {
  id: number;
  isActive: boolean;
};

export type LeadUserWithName = {
  id: number;
  fullName: string;
};

export type AssignableExecutivesScope = {
  actorRole: "superuser" | "admin" | "sales_manager" | "supervisor";
  actorBranchId: number;
};

export type LeadUserScopeRepository = {
  findUserById(id: number): Promise<LeadUser | undefined>;
  isExecutiveAssignable(
    scope: AssignableExecutivesScope,
    executiveId: number,
  ): Promise<boolean>;
  listAssignableExecutives(
    scope: AssignableExecutivesScope,
    options?: { search?: string; limit?: number },
  ): Promise<LeadUserWithName[]>;
};
