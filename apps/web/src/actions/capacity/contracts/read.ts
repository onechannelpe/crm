export type SearchCapacityPolicyView = {
  monthlyLimit: number;
  source: "system" | "branch" | "team" | "user";
};

export type LeadCapacityPolicyView = {
  bufferTarget: number;
  dailyLimit: number;
  source: "system" | "branch" | "team" | "user";
};

export type SearchCapacityStatusView = {
  policy: SearchCapacityPolicyView;
  granted: number;
  committed: number;
  remaining: number;
};

export type LeadCapacityStatusView = {
  policy: LeadCapacityPolicyView;
  activeAssignments: number;
  granted: number;
  committed: number;
  remaining: number;
};

export type ManagedExecutiveView = {
  id: number;
  fullName: string;
  email: string;
  teamId: number | null;
  searchStatus: SearchCapacityStatusView;
  leadStatus: LeadCapacityStatusView;
};

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

export type ExecutiveCapacityRequestView = {
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
};

export type ExecutiveCapacityDetailView = {
  executive: {
    id: number;
    fullName: string;
    email: string;
    teamId: number | null;
  };
  searchStatus: SearchCapacityStatusView;
  leadStatus: LeadCapacityStatusView;
  requests: ExecutiveCapacityRequestView[];
};
