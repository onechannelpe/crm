export type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<number, "UserId">;
export type TeamId = Brand<number, "TeamId">;
export type BranchId = Brand<number, "BranchId">;
export type AssignmentId = Brand<number, "AssignmentId">;
export type CapacityRequestId = Brand<number, "CapacityRequestId">;

export function asUserId(value: number): UserId {
  return value as UserId;
}

export function asTeamId(value: number): TeamId {
  return value as TeamId;
}

export function asBranchId(value: number): BranchId {
  return value as BranchId;
}

export function asAssignmentId(value: number): AssignmentId {
  return value as AssignmentId;
}

export function asCapacityRequestId(value: number): CapacityRequestId {
  return value as CapacityRequestId;
}
