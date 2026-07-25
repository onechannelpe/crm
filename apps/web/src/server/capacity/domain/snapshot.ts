import {
  remainingCapacity,
  sumAmount,
  sumPending,
} from "~/server/capacity/domain/math";
import type { ReservationStatus } from "~/server/capacity/domain/types";

import type { LeadPolicy, SearchPolicy } from "./policy";

type GrantRow = { amount: number };
type CommitRow = { amount: number };
type ReservationRow = { amount: number; status: ReservationStatus };

export interface SearchCapacitySnapshot {
  policy: SearchPolicy;
  granted: number;
  committed: number;
  pending: number;
  remaining: number;
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
}): SearchCapacitySnapshot {
  const granted = sumAmount(input.grants);
  const committed = sumAmount(input.commits);
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
  };
}

export function buildLeadCapacitySnapshot(input: {
  policy: LeadPolicy;
  grants: GrantRow[];
  commits: CommitRow[];
  reservations: ReservationRow[];
  activeAssignments: number;
}): LeadCapacitySnapshot {
  const granted = sumAmount(input.grants);
  const committed = sumAmount(input.commits);
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
