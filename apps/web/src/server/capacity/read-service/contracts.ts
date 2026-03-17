import type { LeadCapacitySnapshot } from "~/server/lead-operations/refill-service";
import type { SearchAllowanceSnapshot } from "~/server/search-access/allowance-service";
import type { Repositories } from "~/server/shared/registry";

export type ManagedExecutiveSummary = {
  id: number;
  fullName: string;
  email: string;
  teamId: number | null;
  searchStatus: SearchAllowanceSnapshot;
  leadStatus: LeadCapacitySnapshot;
};

export type ExecutiveCapacityDetail = {
  executive: {
    id: number;
    fullName: string;
    email: string;
    teamId: number | null;
  };
  searchStatus: SearchAllowanceSnapshot;
  leadStatus: LeadCapacitySnapshot;
  searchPolicy: {
    source: SearchAllowanceSnapshot["policySource"];
    monthlySearchLimit: number;
  };
  leadPolicy: {
    source: LeadCapacitySnapshot["policySource"];
    activeBufferTarget: number;
    dailyRefillLimit: number;
  };
  requests: Awaited<ReturnType<Repositories["capacityRequests"]["listByUser"]>>;
};

export type CapacityPolicyDefaults = {
  branchId: number;
  branchSearchLimit: number | null;
  branchActiveBufferTarget: number | null;
  branchDailyRefillLimit: number | null;
  teams: Array<{
    teamId: number;
    teamName: string;
    searchLimit: number | null;
    activeBufferTarget: number | null;
    dailyRefillLimit: number | null;
  }>;
};

export type AuditChangePrimitive = string | number | boolean | null;
export type AuditChangeValue =
  | AuditChangePrimitive
  | AuditChangeObject
  | AuditChangeValue[];
export type AuditChangeObject = { [key: string]: AuditChangeValue };

export type CapacityAuditEvent = {
  id: number;
  createdAt: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  changes: AuditChangeValue;
};
