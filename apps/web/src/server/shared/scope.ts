// Canonical unions for the policy and capacity domain.
// workflow-types.ts owns the engine/workflow surface (CandidateStrategy, extended SearchType).
// This file owns the policy-domain unions only.

export type ScopeType = "branch" | "team" | "user";

export type PolicySource = "system" | "branch" | "team" | "user";

export type CapacityKind = "search" | "lead";

export type ReservationStatus =
  | "pending"
  | "committed"
  | "cancelled"
  | "expired";

// Subset of search types used by the capacity/policy domain.
// The engine surface uses the extended SearchType from workflow-types.ts.
export type SearchType = "dni" | "ruc" | "name";

export const POLICY_SEARCH_TYPES = [
  "dni",
  "ruc",
  "name",
] as const satisfies ReadonlyArray<SearchType>;

export function isPolicySearchType(value: string): value is SearchType {
  return POLICY_SEARCH_TYPES.some((t) => t === value);
}
