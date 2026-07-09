import type { BranchId, TeamId } from "~/server/shared/ids";

export type CapacityRequestKind = "search_extra" | "lead_refill";

export type ScopeRef =
  | { kind: "branch"; scopeId: BranchId }
  | { kind: "team"; scopeId: TeamId };
