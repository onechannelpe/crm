import type { LeadCandidate } from "~/server/engine-gateway/types";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";
import type { PolicySource, ScopeType } from "~/server/shared/pipeline-types";

type PolicyScopeId = BranchId | TeamId;

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
  scopeId: PolicyScopeId;
  activeBufferTarget: number;
  dailyRefillLimit: number;
}

export interface SetLeadUserOverrideCommand {
  targetUserId: UserId;
  activeBufferTarget: number;
  dailyRefillLimit: number;
  setByUserId: UserId;
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
  userId: UserId;
  candidates: LeadCandidate[];
}
