import type { PolicySource, ScopeType } from "~/server/shared/pipeline-types";

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
  scopeId: number;
  monthlySearchLimit: number;
}

export interface SetSearchUserOverrideCommand {
  targetUserId: number;
  monthlySearchLimit: number;
  setByUserId: number;
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
