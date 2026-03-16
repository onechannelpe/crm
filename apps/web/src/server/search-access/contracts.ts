import type { BranchId, TeamId, UserId } from "~/server/shared/ids";
import type { PolicySource, ScopeType } from "~/server/shared/pipeline-types";

type PolicyScopeId = BranchId | TeamId;

export interface EffectiveSearchPolicy {
  source: PolicySource;
  monthlySearchLimit: number;
}

export interface ResolveEffectiveSearchPolicyInput {
  userOverride?: { search_limit: number } | null;
  teamDefault?: { search_limit: number } | null;
  branchDefault?: { search_limit: number } | null;
}

export interface SetSearchScopeDefaultCommand {
  scopeType: ScopeType;
  scopeId: PolicyScopeId;
  monthlySearchLimit: number;
}

export interface SetSearchUserOverrideCommand {
  targetUserId: UserId;
  monthlySearchLimit: number;
  setByUserId: UserId;
  expiresAt: number | null;
}

export interface SearchAllowanceSnapshot {
  periodStart: string;
  periodEnd: string;
  policySource: PolicySource;
  monthlySearchLimit: number;
  extraGranted: number;
  usedAmount: number;
  remaining: number;
}
