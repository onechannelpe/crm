import type { ExecutiveCategory } from "~/domain/identity/executive-category";

export type PolicySource = "system" | "branch" | "team" | "user";

export type SearchPolicyView = {
  source: PolicySource;
  monthlyLimit: number;
};

export type LeadPolicyView = {
  source: PolicySource;
  bufferTarget: number;
  dailyLimit: number;
};

export type SearchCapacitySnapshot = {
  policy: SearchPolicyView;
  granted: number;
  committed: number;
  pending: number;
  remaining: number;
};

export type LeadCapacitySnapshot = {
  policy: LeadPolicyView;
  granted: number;
  committed: number;
  pending: number;
  remaining: number;
  activeAssignments: number;
};

export type CapacityRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "canceled";

export type PendingCapacityRequestView = {
  id: string;
  userId: string;
  kind: "search_extra" | "lead_refill";
  status: CapacityRequestStatus;
  requestedAmount: number;
  reason: string;
  decisionNote: string | null;
  reviewerUserId: string | null;
  createdAt: number;
  updatedAt: number;
  decidedAt: number | null;
  names: string;
  firstSurname: string;
  secondSurname: string;
  teamId: string | null;
  branchId: string;
};

export type CapacityPolicyTeamDefaultsView = {
  teamId: string;
  teamName: string;
  searchLimit: number | null;
  activeBufferTarget: number | null;
  dailyRefillLimit: number | null;
};

export type CapacityPolicyDefaultsView = {
  branchId: string;
  branchSearchLimit: number | null;
  branchActiveBufferTarget: number | null;
  branchDailyRefillLimit: number | null;
  teams: CapacityPolicyTeamDefaultsView[];
};

export type ManagedExecutiveView = {
  id: string;
  fullName: string;
  email: string;
  teamId: string | null;
  executiveCategory: ExecutiveCategory | null;
  searchStatus: SearchCapacitySnapshot;
  leadStatus: LeadCapacitySnapshot;
};

export type ExecutiveCapacityDetailView = {
  executive: {
    id: string;
    fullName: string;
    email: string;
    teamId: string | null;
    executiveCategory: ExecutiveCategory | null;
  };
  searchStatus: SearchCapacitySnapshot;
  leadStatus: LeadCapacitySnapshot;
  requests: {
    id: string;
    userId: string;
    kind: "search_extra" | "lead_refill";
    status: CapacityRequestStatus;
    requestedAmount: number;
    reason: string;
    decisionNote: string | null;
    reviewerUserId: string | null;
    createdAt: number;
    updatedAt: number;
    decidedAt: number | null;
  }[];
};
