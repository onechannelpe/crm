import type { BranchId, CapacityRequestId, TeamId, UserId } from "~/server/shared/ids";

export type CapacityRequestKind = "search_extra" | "lead_refill";
export type CapacityRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "canceled";

export type ScopeRef =
  | { kind: "branch"; scopeId: BranchId }
  | { kind: "team"; scopeId: TeamId };

export interface CapacityRequest {
  id: CapacityRequestId;
  userId: UserId;
  kind: CapacityRequestKind;
  status: CapacityRequestStatus;
  requestedAmount: number;
  reason: string;
}
