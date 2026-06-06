// Canonical unions for the policy and capacity domain.

export type ScopeType = "branch" | "team" | "user";

export type PolicySource = "system" | "branch" | "team" | "user";

export type CapacityKind = "search" | "lead";

export type ReservationStatus =
  | "pending"
  | "committed"
  | "cancelled"
  | "expired";
