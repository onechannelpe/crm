import type { SessionData } from "~/lib/auth/access/session";
import type { LeadCapacitySnapshot } from "~/server/lead-operations/contracts";
import type { SearchAllowanceSnapshot } from "~/server/search-access/contracts";
import type { ScopeType } from "~/server/shared/pipeline-types";

export type CapacityRequestKind = "search_extra" | "lead_refill_extra";

export interface CapacityPolicyScopeInput {
  scopeType: ScopeType;
  scopeId: number;
}

export interface CapacityGrantCommand {
  userId: number;
  amount: number;
  reason: string;
}

export interface CapacityApprovalCommand {
  requestId: number;
  note?: string;
}

export interface CapacityRejectCommand {
  requestId: number;
  note: string;
}

export interface CapacityReadManagedExecutive {
  id: number;
  fullName: string;
  email: string;
  teamId: number | null;
  searchStatus: SearchAllowanceSnapshot;
  leadStatus: LeadCapacitySnapshot;
}

export interface CapacityRequestRecord {
  id: number;
  user_id: number;
  kind: "search_extra" | "lead_refill_extra";
  status: "pending" | "approved" | "rejected";
  requested_amount: number;
  reason: string;
  decision_note: string | null;
  reviewer_user_id: number | null;
  created_at: number;
  updated_at: number;
  decided_at: number | null;
}

export interface CapacityReadExecutiveDetail {
  executive: {
    id: number;
    fullName: string;
    email: string;
    teamId: number | null;
  };
  searchStatus: SearchAllowanceSnapshot;
  leadStatus: LeadCapacitySnapshot;
  searchPolicy: {
    source: "user" | "team" | "branch" | "system";
    monthlySearchLimit: number;
  };
  leadPolicy: {
    source: "user" | "team" | "branch" | "system";
    activeBufferTarget: number;
    dailyRefillLimit: number;
  };
  requests: CapacityRequestRecord[];
}

export interface CapacityActorScopeInput {
  actor: SessionData;
  targetUserId: number;
}
