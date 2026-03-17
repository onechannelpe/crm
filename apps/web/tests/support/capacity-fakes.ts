/**
 * In-memory repo fakes for capacity-usage integration tests.
 * Each factory returns a stateful object that mirrors the real repo interface.
 */

import type { ReservationStatus } from "~/server/shared/scope";

type GrantRow = {
  id: string;
  user_id: number;
  amount: number;
  reason: string;
  actor_user_id: number;
  created_at: number;
};
type ReservationRow = {
  id: string;
  user_id: number;
  amount: number;
  reason: string;
  status: ReservationStatus;
  created_at: number;
  updated_at: number;
};
type CommitRow = {
  id: string;
  reservation_id: string;
  amount: number;
  created_at: number;
};

export function makeSearchCapacityGrantsRepo() {
  const rows: GrantRow[] = [];
  return {
    rows,
    insert(values: {
      user_id: number;
      amount: number;
      reason: string;
      actor_user_id: number;
    }): Promise<void> {
      rows.push({ id: crypto.randomUUID(), ...values, created_at: Date.now() });
      return Promise.resolve();
    },
    findByUserAndPeriod(
      userId: number,
      _periodStart?: string,
      _periodEnd?: string,
    ): Promise<GrantRow[]> {
      return Promise.resolve(rows.filter((r) => r.user_id === userId));
    },
  };
}

export function makeSearchUsageReservationsRepo() {
  const rows: ReservationRow[] = [];
  return {
    rows,
    insert(values: {
      user_id: number;
      amount: number;
      reason: string;
    }): Promise<{ id: string }> {
      const id = crypto.randomUUID();
      const now = Date.now();
      rows.push({
        id,
        ...values,
        status: "pending",
        created_at: now,
        updated_at: now,
      });
      return Promise.resolve({ id });
    },
    findById(id: string): Promise<ReservationRow | undefined> {
      return Promise.resolve(rows.find((r) => r.id === id));
    },
    updateStatus(
      id: string,
      status: "committed" | "cancelled" | "expired",
    ): Promise<void> {
      const row = rows.find((r) => r.id === id);
      if (row) row.status = status;
      return Promise.resolve();
    },
    findByUserAndPeriod(userId: number): Promise<ReservationRow[]> {
      return Promise.resolve(rows.filter((r) => r.user_id === userId));
    },
  };
}

export function makeSearchUsageCommitsRepo() {
  const rows: CommitRow[] = [];
  return {
    rows,
    insert(values: { reservation_id: string; amount: number }): Promise<void> {
      rows.push({ id: crypto.randomUUID(), ...values, created_at: Date.now() });
      return Promise.resolve();
    },
    findByReservation(reservationId: string): Promise<CommitRow[]> {
      return Promise.resolve(
        rows.filter((r) => r.reservation_id === reservationId),
      );
    },
    findByUserAndPeriod(): Promise<CommitRow[]> {
      return Promise.resolve(rows);
    },
  };
}

export function makeLeadCapacityGrantsRepo() {
  const rows: GrantRow[] = [];
  return {
    rows,
    insert(values: {
      user_id: number;
      amount: number;
      reason: string;
      actor_user_id: number;
    }): Promise<void> {
      rows.push({ id: crypto.randomUUID(), ...values, created_at: Date.now() });
      return Promise.resolve();
    },
    findByUserAndDate(userId: number, _date?: string): Promise<GrantRow[]> {
      return Promise.resolve(rows.filter((r) => r.user_id === userId));
    },
  };
}

export function makeLeadUsageReservationsRepo() {
  const rows: ReservationRow[] = [];
  return {
    rows,
    insert(values: {
      user_id: number;
      amount: number;
      reason: string;
    }): Promise<{ id: string }> {
      const id = crypto.randomUUID();
      const now = Date.now();
      rows.push({
        id,
        ...values,
        status: "pending",
        created_at: now,
        updated_at: now,
      });
      return Promise.resolve({ id });
    },
    findById(id: string): Promise<ReservationRow | undefined> {
      return Promise.resolve(rows.find((r) => r.id === id));
    },
    updateStatus(
      id: string,
      status: "committed" | "cancelled" | "expired",
    ): Promise<void> {
      const row = rows.find((r) => r.id === id);
      if (row) row.status = status;
      return Promise.resolve();
    },
    findByUserAndDate(userId: number): Promise<ReservationRow[]> {
      return Promise.resolve(rows.filter((r) => r.user_id === userId));
    },
  };
}

export function makeLeadUsageCommitsRepo() {
  const rows: CommitRow[] = [];
  return {
    rows,
    insert(values: { reservation_id: string; amount: number }): Promise<void> {
      rows.push({ id: crypto.randomUUID(), ...values, created_at: Date.now() });
      return Promise.resolve();
    },
    findByReservation(reservationId: string): Promise<CommitRow[]> {
      return Promise.resolve(
        rows.filter((r) => r.reservation_id === reservationId),
      );
    },
    findByUserAndDate(): Promise<CommitRow[]> {
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
