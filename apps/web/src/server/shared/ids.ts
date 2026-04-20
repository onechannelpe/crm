import { brand, type Brand } from "~/lib/types/brand";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// --- String IDs (UUIDs) ---

export type LeadId = Brand<string, "LeadId">;
export const asLeadId = (id: string): LeadId => brand<string, "LeadId">(id);
export function createLeadId(): LeadId {
  return asLeadId(crypto.randomUUID());
}
export function isLeadId(value: string): value is LeadId {
  return UUID_RE.test(value);
}

export type UserId = Brand<string, "UserId">;
export const asUserId = (id: string): UserId => brand<string, "UserId">(id);
export function createUserId(): UserId {
  return asUserId(crypto.randomUUID());
}
export function isUserId(value: string): value is UserId {
  return UUID_RE.test(value);
}

export type BranchId = Brand<string, "BranchId">;
export const asBranchId = (id: string): BranchId =>
  brand<string, "BranchId">(id);
export function createBranchId(): BranchId {
  return asBranchId(crypto.randomUUID());
}
export function isBranchId(value: string): value is BranchId {
  return UUID_RE.test(value);
}

export type TeamId = Brand<string, "TeamId">;
export const asTeamId = (id: string): TeamId => brand<string, "TeamId">(id);
export function createTeamId(): TeamId {
  return asTeamId(crypto.randomUUID());
}
export function isTeamId(value: string): value is TeamId {
  return UUID_RE.test(value);
}

export type ContactId = Brand<string, "ContactId">;
export const asContactId = (id: string): ContactId =>
  brand<string, "ContactId">(id);
export function createContactId(): ContactId {
  return asContactId(crypto.randomUUID());
}
export function isContactId(value: string): value is ContactId {
  return UUID_RE.test(value);
}

export type AssignmentId = Brand<string, "AssignmentId">;
export const asAssignmentId = (id: string): AssignmentId =>
  brand<string, "AssignmentId">(id);
export function createAssignmentId(): AssignmentId {
  return asAssignmentId(crypto.randomUUID());
}
export function isAssignmentId(value: string): value is AssignmentId {
  return UUID_RE.test(value);
}

export type OrganizationId = Brand<string, "OrganizationId">;
export const asOrganizationId = (id: string): OrganizationId =>
  brand<string, "OrganizationId">(id);
export function createOrganizationId(): OrganizationId {
  return asOrganizationId(crypto.randomUUID());
}
export function isOrganizationId(value: string): value is OrganizationId {
  return UUID_RE.test(value);
}

// --- Numeric IDs (DB-assigned, internal only) ---

export type CapacityRequestId = Brand<number, "CapacityRequestId">;
export const asCapacityRequestId = (id: number): CapacityRequestId =>
  brand<number, "CapacityRequestId">(id);

export type InviteId = Brand<number, "InviteId">;
export const asInviteId = (id: number): InviteId =>
  brand<number, "InviteId">(id);

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
