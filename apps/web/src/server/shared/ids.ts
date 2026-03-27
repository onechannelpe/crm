export type UserId = number;
export type TeamId = number;
export type BranchId = number;
export type AssignmentId = number;
export type CapacityRequestId = number;
export type SearchReservationId = string & {
  readonly __brand: "SearchReservationId";
};
export type LeadReservationId = string & {
  readonly __brand: "LeadReservationId";
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const brandStr = <T>(v: string): T => v as unknown as T;

function assertNonEmptyStringId<T>(value: string, name: string): T {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return brandStr<T>(value);
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
