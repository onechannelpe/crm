export type CapacityRequestKind = "search_extra" | "lead_refill";
export type CapacityRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "canceled";

export type ScopeRef =
  | { kind: "branch"; scopeId: number }
  | { kind: "team"; scopeId: number };

export interface CapacityRequest {
  id: number;
  userId: number;
  kind: CapacityRequestKind;
  status: CapacityRequestStatus;
  requestedAmount: number;
  reason: string;
}
