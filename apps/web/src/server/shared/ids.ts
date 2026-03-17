export type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<number, "UserId">;
export type TeamId = Brand<number, "TeamId">;
export type BranchId = Brand<number, "BranchId">;
export type AssignmentId = Brand<number, "AssignmentId">;
export type CapacityRequestId = Brand<number, "CapacityRequestId">;
export type SearchReservationId = Brand<string, "SearchReservationId">;
export type LeadReservationId = Brand<string, "LeadReservationId">;

function assertPositiveIntId(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export function asUserId(value: number): UserId {
  return assertPositiveIntId(value, "UserId") as UserId;
}

export function asTeamId(value: number): TeamId {
  return assertPositiveIntId(value, "TeamId") as TeamId;
}

export function asBranchId(value: number): BranchId {
  return assertPositiveIntId(value, "BranchId") as BranchId;
}

export function asAssignmentId(value: number): AssignmentId {
  return assertPositiveIntId(value, "AssignmentId") as AssignmentId;
}

export function asCapacityRequestId(value: number): CapacityRequestId {
  return assertPositiveIntId(value, "CapacityRequestId") as CapacityRequestId;
}

function assertNonEmptyStringId(value: string, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

export function asSearchReservationId(value: string): SearchReservationId {
  return assertNonEmptyStringId(value, "SearchReservationId") as SearchReservationId;
}

export function asLeadReservationId(value: string): LeadReservationId {
  return assertNonEmptyStringId(value, "LeadReservationId") as LeadReservationId;
}
