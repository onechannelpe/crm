import { availableLeadRefill } from "~/server/lead-operations/domain";
import type { LeadCapacitySnapshot } from "~/server/lead-operations/refill-service";
import type { SearchAllowanceSnapshot } from "~/server/search-access/allowance-service";
import { availableAllowance } from "~/server/search-access/domain";
import type { PolicySource } from "~/server/shared/pipeline-types";

export function buildSearchStatus(input: {
  periodStart: string;
  periodEnd: string;
  ledger:
    | {
        period_end: string;
        base_limit: number;
        extra_granted: number;
        used_amount: number;
      }
    | null
    | undefined;
  policy: { source: PolicySource; monthlySearchLimit: number };
}): SearchAllowanceSnapshot {
  const monthlySearchLimit =
    input.ledger?.base_limit ?? input.policy.monthlySearchLimit;
  const extraGranted = input.ledger?.extra_granted ?? 0;
  const usedAmount = input.ledger?.used_amount ?? 0;

  return {
    periodStart: input.periodStart,
    periodEnd: input.ledger?.period_end ?? input.periodEnd,
    policySource: input.policy.source,
    monthlySearchLimit,
    extraGranted,
    usedAmount,
    remaining: availableAllowance({
      baseLimit: monthlySearchLimit,
      extraGranted,
      usedAmount,
    }),
  };
}

export function buildLeadStatus(input: {
  activeAssignments: number;
  ledger:
    | {
        base_limit: number;
        extra_granted: number;
        used_amount: number;
      }
    | null
    | undefined;
  policy: {
    source: PolicySource;
    activeBufferTarget: number;
    dailyRefillLimit: number;
  };
}): LeadCapacitySnapshot {
  const dailyRefillLimit =
    input.ledger?.base_limit ?? input.policy.dailyRefillLimit;
  const extraGranted = input.ledger?.extra_granted ?? 0;
  const usedAmount = input.ledger?.used_amount ?? 0;

  return {
    policySource: input.policy.source,
    activeBufferTarget: input.policy.activeBufferTarget,
    activeAssignments: input.activeAssignments,
    dailyRefillLimit,
    extraGranted,
    usedAmount,
    remaining: availableLeadRefill({
      baseLimit: dailyRefillLimit,
      extraGranted,
      usedAmount,
    }),
  };
}
