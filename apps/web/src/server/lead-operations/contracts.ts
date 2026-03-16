import type { LeadCandidate } from "~/server/engine-gateway/contracts";
import type { PolicySource, ScopeType } from "~/server/shared/pipeline-types";

export interface EffectiveLeadPolicy {
  source: PolicySource;
  activeBufferTarget: number;
  dailyRefillLimit: number;
}

export interface ResolveEffectiveLeadPolicyInput {
  userOverride?: {
    active_buffer_target: number;
    daily_refill_limit: number;
  } | null;
  teamDefault?: {
    active_buffer_target: number;
    daily_refill_limit: number;
  } | null;
  branchDefault?: {
    active_buffer_target: number;
    daily_refill_limit: number;
  } | null;
}

export interface SetLeadScopeDefaultCommand {
  scopeType: ScopeType;
  scopeId: number;
  activeBufferTarget: number;
  dailyRefillLimit: number;
}

export interface SetLeadUserOverrideCommand {
  targetUserId: number;
  activeBufferTarget: number;
  dailyRefillLimit: number;
  setByUserId: number;
  expiresAt: number | null;
}

export interface LeadCapacitySnapshot {
  policySource: PolicySource;
  activeBufferTarget: number;
  activeAssignments: number;
  dailyRefillLimit: number;
  extraGranted: number;
  usedAmount: number;
  remaining: number;
}

export interface LeadRefillResult {
  assigned: number;
  requested: number;
}

export interface LeadAssignmentCommand {
  userId: number;
  candidates: LeadCandidate[];
}
