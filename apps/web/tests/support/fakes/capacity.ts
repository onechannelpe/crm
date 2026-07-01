/**
 * In-memory repo fakes for capacity-usage integration tests.
 * Each factory returns a stateful object that mirrors the real repo interface.
 */

import {
  asLeadReservationId,
  asSearchReservationId,
  type LeadReservationId,
  type SearchReservationId,
  type UserId,
} from "~/server/shared/ids";
import type { ReservationStatus } from "~/server/shared/scope";

type GrantRow = {
  id: string;
  user_id: UserId;
  amount: number;
  reason: string;
  actor_user_id: UserId;
  created_at: Date;
};
type SearchReservationRow = {
  id: SearchReservationId;
  user_id: UserId;
  amount: number;
  reason: string;
  status: ReservationStatus;
  created_at: Date;
  updated_at: Date;
};
type LeadReservationRow = {
  id: LeadReservationId;
  user_id: UserId;
  amount: number;
  reason: string;
  status: ReservationStatus;
  created_at: Date;
  updated_at: Date;
};
type SearchCommitRow = {
  id: string;
  reservation_id: SearchReservationId;
  amount: number;
  created_at: Date;
};
type LeadCommitRow = {
  id: string;
  reservation_id: LeadReservationId;
  amount: number;
  created_at: Date;
};

export function makeSearchCapacityGrantsRepo() {
  const rows: GrantRow[] = [];
  return {
    rows,
    insert(values: {
      user_id: UserId;
      amount: number;
      reason: string;
      actor_user_id: UserId;
    }): Promise<void> {
      rows.push({ id: crypto.randomUUID(), ...values, created_at: new Date() });
      return Promise.resolve();
    },
    findByUserAndPeriod(
      userId: UserId,
      _periodStart?: string,
      _periodEnd?: string,
    ): Promise<GrantRow[]> {
      return Promise.resolve(rows.filter((r) => r.user_id === userId));
    },
  };
}

export function makeSearchUsageReservationsRepo() {
  const rows: SearchReservationRow[] = [];
  return {
    rows,
    insert(values: {
      user_id: UserId;
      amount: number;
      reason: string;
    }): Promise<{ id: SearchReservationId }> {
      const id = asSearchReservationId(crypto.randomUUID());
      const now = new Date();
      rows.push({
        id,
        ...values,
        status: "pending",
        created_at: now,
        updated_at: now,
      });
      return Promise.resolve({ id });
    },
    findById(
      id: SearchReservationId,
    ): Promise<SearchReservationRow | undefined> {
      return Promise.resolve(rows.find((r) => r.id === id));
    },
    updateStatus(
      id: SearchReservationId,
      status: "committed" | "cancelled" | "expired",
    ): Promise<void> {
      const row = rows.find((r) => r.id === id);
      if (row) row.status = status;
      return Promise.resolve();
    },
    findByUserAndPeriod(userId: UserId): Promise<SearchReservationRow[]> {
      return Promise.resolve(rows.filter((r) => r.user_id === userId));
    },
  };
}

export function makeSearchUsageCommitsRepo() {
  const rows: SearchCommitRow[] = [];
  return {
    rows,
    insert(values: {
      reservation_id: SearchReservationId;
      amount: number;
    }): Promise<void> {
      rows.push({ id: crypto.randomUUID(), ...values, created_at: new Date() });
      return Promise.resolve();
    },
    findByReservation(
      reservationId: SearchReservationId,
    ): Promise<SearchCommitRow[]> {
      return Promise.resolve(
        rows.filter((r) => r.reservation_id === reservationId),
      );
    },
    findByUserAndPeriod(): Promise<SearchCommitRow[]> {
      return Promise.resolve(rows);
    },
  };
}

export function makeLeadCapacityGrantsRepo() {
  const rows: GrantRow[] = [];
  return {
    rows,
    insert(values: {
      user_id: UserId;
      amount: number;
      reason: string;
      actor_user_id: UserId;
    }): Promise<void> {
      rows.push({ id: crypto.randomUUID(), ...values, created_at: new Date() });
      return Promise.resolve();
    },
    findByUserAndDate(userId: UserId, _date?: string): Promise<GrantRow[]> {
      return Promise.resolve(rows.filter((r) => r.user_id === userId));
    },
  };
}

export function makeLeadUsageReservationsRepo() {
  const rows: LeadReservationRow[] = [];
  return {
    rows,
    insert(values: {
      user_id: UserId;
      amount: number;
      reason: string;
    }): Promise<{ id: LeadReservationId }> {
      const id = asLeadReservationId(crypto.randomUUID());
      const now = new Date();
      rows.push({
        id,
        ...values,
        status: "pending",
        created_at: now,
        updated_at: now,
      });
      return Promise.resolve({ id });
    },
    findById(id: LeadReservationId): Promise<LeadReservationRow | undefined> {
      return Promise.resolve(rows.find((r) => r.id === id));
    },
    updateStatus(
      id: LeadReservationId,
      status: "committed" | "cancelled" | "expired",
    ): Promise<void> {
      const row = rows.find((r) => r.id === id);
      if (row) row.status = status;
      return Promise.resolve();
    },
    updateAmountAndStatus(
      id: LeadReservationId,
      amount: number,
      status: "committed" | "cancelled" | "expired",
    ): Promise<void> {
      const row = rows.find((r) => r.id === id);
      if (row) {
        row.amount = amount;
        row.status = status;
      }
      return Promise.resolve();
    },
    findByUserAndDate(userId: UserId): Promise<LeadReservationRow[]> {
      return Promise.resolve(rows.filter((r) => r.user_id === userId));
    },
  };
}

export function makeLeadUsageCommitsRepo() {
  const rows: LeadCommitRow[] = [];
  return {
    rows,
    insert(values: {
      reservation_id: LeadReservationId;
      amount: number;
    }): Promise<void> {
      rows.push({ id: crypto.randomUUID(), ...values, created_at: new Date() });
      return Promise.resolve();
    },
    findByReservation(
      reservationId: LeadReservationId,
    ): Promise<LeadCommitRow[]> {
      return Promise.resolve(
        rows.filter((r) => r.reservation_id === reservationId),
      );
    },
    findByUserAndDate(): Promise<LeadCommitRow[]> {
      return Promise.resolve(rows);
    },
  };
}

/** Minimal policy repos that return no overrides (system defaults apply). */
export function makeNullSearchPolicyRepos() {
  return {
    searchPolicyDefaults: {
      findForScope: async () => undefined,
      listForScope: async () => [],
      upsert: async (): Promise<void> => undefined,
    },
    searchPolicyOverrides: {
      findActiveForUser: async () => undefined,
      listActiveForUsers: async () => [],
      replaceForUser: async (): Promise<void> => undefined,
    },
  };
}

export function makeNullLeadPolicyRepos() {
  return {
    leadPolicyDefaults: {
      findForScope: async () => undefined,
      listForScope: async () => [],
      upsert: async (): Promise<void> => undefined,
    },
    leadPolicyOverrides: {
      findActiveForUser: async () => undefined,
      listActiveForUsers: async () => [],
      replaceForUser: async (): Promise<void> => undefined,
    },
  };
}
