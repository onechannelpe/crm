export type PendingCapacityRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "canceled";

export type PendingCapacityRequestView = {
  id: number;
  userId: number;
  kind: "search_extra" | "lead_refill";
  status: PendingCapacityRequestStatus;
  requestedAmount: number;
  reason: string;
  decisionNote: string | null;
  reviewerUserId: number | null;
  createdAt: number;
  updatedAt: number;
  decidedAt: number | null;
  names: string;
  firstSurname: string;
  secondSurname: string;
  teamId: number | null;
  branchId: number;
};
