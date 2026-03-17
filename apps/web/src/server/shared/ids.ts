export type UserId = number & { readonly __brand: "UserId" };
export type TeamId = number & { readonly __brand: "TeamId" };
export type BranchId = number & { readonly __brand: "BranchId" };
export type AssignmentId = number & { readonly __brand: "AssignmentId" };
export type CapacityRequestId = number & { readonly __brand: "CapacityRequestId" };
export type SearchReservationId = string & { readonly __brand: "SearchReservationId" };
export type LeadReservationId = string & { readonly __brand: "LeadReservationId" };

function assertPositiveIntId(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export function asUserId(value: number): UserId {
  return assertPositiveIntId(value, "UserId") as number & { readonly __brand: "UserId" };
}

export function asTeamId(value: number): TeamId {
  return assertPositiveIntId(value, "TeamId") as number & { readonly __brand: "TeamId" };
}

export function asBranchId(value: number): BranchId {
  return assertPositiveIntId(value, "BranchId") as number & { readonly __brand: "BranchId" };
}

export function asAssignmentId(value: number): AssignmentId {
  return assertPositiveIntId(value, "AssignmentId") as number & { readonly __brand: "AssignmentId" };
}

export function asCapacityRequestId(value: number): CapacityRequestId {
  return assertPositiveIntId(value, "CapacityRequestId") as number & { readonly __brand: "CapacityRequestId" };
}

function assertNonEmptyStringId(value: string, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

export function asSearchReservationId(value: string): SearchReservationId {
  return assertNonEmptyStringId(value, "SearchReservationId") as string & { readonly __brand: "SearchReservationId" };
}

export function asLeadReservationId(value: string): LeadReservationId {
  return assertNonEmptyStringId(value, "LeadReservationId") as string & { readonly __brand: "LeadReservationId" };
}
