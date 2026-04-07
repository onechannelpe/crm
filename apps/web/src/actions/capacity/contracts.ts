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
  periodStart: string;
  periodEnd: string;
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

export type AuditChangeValue =
  | string
  | number
  | boolean
  | null
  | AuditChangeValue[]
  | { [k: string]: AuditChangeValue };

export type CapacityAuditEvent = {
  id: number;
  createdAt: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  changes: AuditChangeValue;
};

export type PendingCapacityRequestView = {
  id: number;
  userId: number;
  kind: "search_extra" | "lead_refill";
  status: CapacityRequestStatus;
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

export type CapacityPolicyTeamDefaultsView = {
  teamId: number;
  teamName: string;
  searchLimit: number | null;
  activeBufferTarget: number | null;
  dailyRefillLimit: number | null;
};

export type CapacityPolicyDefaultsView = {
  branchId: number;
  branchSearchLimit: number | null;
  branchActiveBufferTarget: number | null;
  branchDailyRefillLimit: number | null;
  teams: CapacityPolicyTeamDefaultsView[];
};

export type ManagedExecutiveView = {
  id: number;
  fullName: string;
  email: string;
  teamId: number | null;
  searchStatus: SearchCapacitySnapshot;
  leadStatus: LeadCapacitySnapshot;
};

export type ExecutiveCapacityDetailView = {
  executive: {
    id: number;
    fullName: string;
    email: string;
    teamId: number | null;
  };
  searchStatus: SearchCapacitySnapshot;
  leadStatus: LeadCapacitySnapshot;
  requests: {
    id: number;
    userId: number;
    kind: "search_extra" | "lead_refill";
    status: CapacityRequestStatus;
    requestedAmount: number;
    reason: string;
    decisionNote: string | null;
    reviewerUserId: number | null;
    createdAt: number;
    updatedAt: number;
    decidedAt: number | null;
  }[];
};
