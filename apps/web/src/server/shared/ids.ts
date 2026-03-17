export type UserId = number & { readonly __brand: "UserId" };
export type TeamId = number & { readonly __brand: "TeamId" };
export type BranchId = number & { readonly __brand: "BranchId" };
export type AssignmentId = number & { readonly __brand: "AssignmentId" };
export type CapacityRequestId = number & {
  readonly __brand: "CapacityRequestId";
};
export type SearchReservationId = string & {
  readonly __brand: "SearchReservationId";
};
export type LeadReservationId = string & {
  readonly __brand: "LeadReservationId";
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const brandInt = <T>(v: number): T => v as unknown as T;
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const brandStr = <T>(v: string): T => v as unknown as T;

function assertPositiveIntId<T>(value: number, name: string): T {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return brandInt<T>(value);
}

function assertNonEmptyStringId<T>(value: string, name: string): T {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return brandStr<T>(value);
}

export function asUserId(value: number): UserId {
  return assertPositiveIntId<UserId>(value, "UserId");
}

export function asTeamId(value: number): TeamId {
  return assertPositiveIntId<TeamId>(value, "TeamId");
}

export function asBranchId(value: number): BranchId {
  return assertPositiveIntId<BranchId>(value, "BranchId");
}

export function asAssignmentId(value: number): AssignmentId {
  return assertPositiveIntId<AssignmentId>(value, "AssignmentId");
}

export function asCapacityRequestId(value: number): CapacityRequestId {
  return assertPositiveIntId<CapacityRequestId>(value, "CapacityRequestId");
}

export function asSearchReservationId(value: string): SearchReservationId {
  return assertNonEmptyStringId<SearchReservationId>(
    value,
    "SearchReservationId",
  );
}

export function asLeadReservationId(value: string): LeadReservationId {
  return assertNonEmptyStringId<LeadReservationId>(value, "LeadReservationId");
}
