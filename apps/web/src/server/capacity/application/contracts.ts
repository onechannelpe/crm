import type { FieldChange } from "~/contracts/events";
import type { ExecutiveCategoryValue } from "~/lib/db/types";

import type { CapacityRequestStatus } from "../domain/types";
import type { LeadCapacitySnapshot } from "./queries/get-lead-capacity-snapshot";
import type { SearchCapacitySnapshot } from "./queries/get-search-capacity-snapshot";

export type CapacityAuditEvent = {
  id: string;
  createdAt: number;
  actorUserId: number | null;
  type: string;
  entityType: string;
  entityId: string;
  changes: FieldChange[];
  payload: string | null;
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
  executiveCategory: ExecutiveCategoryValue | null;
  searchStatus: SearchCapacitySnapshot;
  leadStatus: LeadCapacitySnapshot;
};

export type ExecutiveCapacityDetailView = {
  executive: {
    id: number;
    fullName: string;
    email: string;
    teamId: number | null;
    executiveCategory: ExecutiveCategoryValue | null;
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
