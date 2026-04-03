export type LeadSourcingPolicy = {
  branchId: number;
  engineAssignmentEnabled: boolean;
  updatedAt: number;
  updatedByUserId: number;
};

export type LeadSourcingPolicyRepository = {
  findByBranchId(branchId: number): Promise<LeadSourcingPolicy | undefined>;
  upsert(values: LeadSourcingPolicy): Promise<unknown>;
};
