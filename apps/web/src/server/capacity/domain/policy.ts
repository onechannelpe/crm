import type { PolicySource } from "~/server/capacity/domain/types";

import { CAPACITY_LIMITS } from "./config";

export interface SearchPolicy {
  source: PolicySource;
  monthlyLimit: number;
}

export interface LeadPolicy {
  source: PolicySource;
  bufferTarget: number;
  dailyLimit: number;
}

export interface ResolveSearchPolicyInput {
  userOverride?: { search_limit: number } | null;
  teamDefault?: { search_limit: number } | null;
  branchDefault?: { search_limit: number } | null;
}

export interface ResolveLeadPolicyInput {
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

export function resolveSearchPolicy(
  input: ResolveSearchPolicyInput,
): SearchPolicy {
  if (input.userOverride) {
    return { source: "user", monthlyLimit: input.userOverride.search_limit };
  }
  if (input.teamDefault) {
    return { source: "team", monthlyLimit: input.teamDefault.search_limit };
  }
  if (input.branchDefault) {
    return { source: "branch", monthlyLimit: input.branchDefault.search_limit };
  }
  return {
    source: "system",
    monthlyLimit: CAPACITY_LIMITS.defaultSearchMonthly,
  };
}

export function resolveLeadPolicy(input: ResolveLeadPolicyInput): LeadPolicy {
  if (input.userOverride) {
    return {
      source: "user",
      bufferTarget: input.userOverride.active_buffer_target,
      dailyLimit: input.userOverride.daily_refill_limit,
    };
  }
  if (input.teamDefault) {
    return {
      source: "team",
      bufferTarget: input.teamDefault.active_buffer_target,
      dailyLimit: input.teamDefault.daily_refill_limit,
    };
  }
  if (input.branchDefault) {
    return {
      source: "branch",
      bufferTarget: input.branchDefault.active_buffer_target,
      dailyLimit: input.branchDefault.daily_refill_limit,
    };
  }
  return {
    source: "system",
    bufferTarget: CAPACITY_LIMITS.defaultLeadBuffer,
    dailyLimit: CAPACITY_LIMITS.defaultDailyRefill,
  };
}
