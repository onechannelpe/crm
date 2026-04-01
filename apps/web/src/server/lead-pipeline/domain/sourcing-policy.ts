export type BranchSourcingPolicy = {
  branchId: number;
  engineAssignmentEnabled: boolean;
  updatedAt: number;
  updatedByUserId: number;
};

export function resolveBranchSourcingPolicy(
  current: BranchSourcingPolicy | null,
  branchId: number,
) {
  if (current) {
    return current;
  }

  return {
    branchId,
    engineAssignmentEnabled: false,
    updatedAt: 0,
    updatedByUserId: 0,
  } satisfies BranchSourcingPolicy;
}
