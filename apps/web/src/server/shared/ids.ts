import { brand, type Brand } from "~/lib/types/brand";

// --- String IDs (UUIDs) ---

export type LeadId = Brand<string, "LeadId">;

// Trusted boundary: only call from DB read paths and createLeadId.
export const asLeadId = (id: string): LeadId => brand<string, "LeadId">(id);

export function createLeadId(): LeadId {
  return asLeadId(crypto.randomUUID());
}

export function isLeadId(value: string): value is LeadId {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

// --- Numeric IDs (DB-assigned) ---

export type UserId = Brand<number, "UserId">;
export type TeamId = Brand<number, "TeamId">;
export type BranchId = Brand<number, "BranchId">;
export type AssignmentId = Brand<number, "AssignmentId">;
export type CapacityRequestId = Brand<number, "CapacityRequestId">;
export type ContactId = Brand<number, "ContactId">;
export type OrganizationId = Brand<number, "OrganizationId">;

// Trusted boundary: only call from DB read paths and action entry-points.
export const asUserId = (id: number): UserId => brand<number, "UserId">(id);
export const asTeamId = (id: number): TeamId => brand<number, "TeamId">(id);
export const asBranchId = (id: number): BranchId =>
  brand<number, "BranchId">(id);
export const asAssignmentId = (id: number): AssignmentId =>
  brand<number, "AssignmentId">(id);
export const asCapacityRequestId = (id: number): CapacityRequestId =>
  brand<number, "CapacityRequestId">(id);
export const asContactId = (id: number): ContactId =>
  brand<number, "ContactId">(id);
export const asOrganizationId = (id: number): OrganizationId =>
  brand<number, "OrganizationId">(id);

// --- Tagged IDs (runtime dispatch semantics) ---

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
