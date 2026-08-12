import type { BranchId, TeamId } from "~/domain/ids";

export type CapacityRequestKind = "search_extra" | "lead_refill";

export type PolicySource = "system" | "branch" | "team" | "user";

export type CapacityKind = "search" | "lead";

export type ReservationStatus =
  | "pending"
  | "committed"
  | "cancelled"
  | "expired";

export type ScopeRef =
  | { kind: "branch"; scopeId: BranchId }
  | { kind: "team"; scopeId: TeamId };
