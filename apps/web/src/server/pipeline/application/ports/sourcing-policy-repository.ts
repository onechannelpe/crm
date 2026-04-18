import type { BranchId, UserId } from "~/server/shared/ids";

export type LeadSourcingPolicy = {
  branchId: BranchId;
  engineAssignmentEnabled: boolean;
  updatedAt: number;
  updatedByUserId: UserId;
};

export type LeadSourcingPolicyRepository = {
  findByBranchId(branchId: BranchId): Promise<LeadSourcingPolicy | undefined>;
  upsert(values: LeadSourcingPolicy): Promise<unknown>;
};
