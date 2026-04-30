export type UserId = number;
export type TeamId = number;
export type BranchId = number;
export type OrganizationId = string;
export type AssignmentId = number;
export type CapacityRequestId = number;
export interface SearchReservationId {
  readonly value: string;
  readonly kind: "SearchReservationId";
}
export interface LeadReservationId {
  readonly value: string;
  readonly kind: "LeadReservationId";
}

function assertNonEmptyStringId(value: string, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

export function asSearchReservationId(value: string): SearchReservationId {
  return {
    value: assertNonEmptyStringId(value, "SearchReservationId"),
    kind: "SearchReservationId",
  };
}

export function asLeadReservationId(value: string): LeadReservationId {
  return {
    value: assertNonEmptyStringId(value, "LeadReservationId"),
    kind: "LeadReservationId",
  };
}
