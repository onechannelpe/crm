export type CapacityRequestKind = "search_extra" | "lead_refill_extra";

export type ScopeRef =
  | { kind: "branch"; scopeId: number }
  | { kind: "team"; scopeId: number };
