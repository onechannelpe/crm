import type { LeadPolicy, SearchPolicy } from "~/server/capacity-policy/domain";
import type { ReservationStatus } from "~/server/shared/scope";

import {
  remainingCapacity,
  sumCommitted,
  sumGranted,
  sumPending,
} from "./domain";

type GrantRow = { amount: number };
type CommitRow = { amount: number };
type ReservationRow = { amount: number; status: ReservationStatus };

export interface SearchCapacitySnapshot {
  policy: SearchPolicy;
  granted: number;
  committed: number;
  pending: number;
  remaining: number;
  periodStart: string;
  periodEnd: string;
}

export interface LeadCapacitySnapshot {
  policy: LeadPolicy;
  granted: number;
  committed: number;
  pending: number;
  remaining: number;
  activeAssignments: number;
}

export function buildSearchCapacitySnapshot(input: {
  policy: SearchPolicy;
  grants: GrantRow[];
  commits: CommitRow[];
  reservations: ReservationRow[];
  periodStart: string;
  periodEnd: string;
}): SearchCapacitySnapshot {
  const granted = sumGranted(input.grants);
  const committed = sumCommitted(input.commits);
  const pending = sumPending(input.reservations);
  const remaining = remainingCapacity({
    limit: input.policy.monthlyLimit,
    granted,
    committed,
    pending,
  });
  return {
    policy: input.policy,
    granted,
    committed,
    pending,
    remaining,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  };
}

export function buildLeadCapacitySnapshot(input: {
  policy: LeadPolicy;
  grants: GrantRow[];
  commits: CommitRow[];
  reservations: ReservationRow[];
  activeAssignments: number;
}): LeadCapacitySnapshot {
  const granted = sumGranted(input.grants);
  const committed = sumCommitted(input.commits);
  const pending = sumPending(input.reservations);
  const remaining = remainingCapacity({
    limit: input.policy.dailyLimit,
    granted,
    committed,
    pending,
  });
  return {
    policy: input.policy,
    granted,
    committed,
    pending,
    remaining,
    activeAssignments: input.activeAssignments,
  };
}
