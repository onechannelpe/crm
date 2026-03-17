/**
 * In-memory repo fakes for capacity-usage integration tests.
 * Each factory returns a stateful object that mirrors the real repo interface.
 */

import type { ReservationStatus } from "~/server/shared/scope";

type GrantRow = { id: string; user_id: number; amount: number; reason: string; actor_user_id: number; created_at: number };
type ReservationRow = { id: string; user_id: number; amount: number; reason: string; status: ReservationStatus; created_at: number; updated_at: number };
type CommitRow = { id: string; reservation_id: string; amount: number; created_at: number };

export function makeSearchCapacityGrantsRepo() {
  const rows: GrantRow[] = [];
  return {
    rows,
    insert(values: { user_id: number; amount: number; reason: string; actor_user_id: number }) {
      const row: GrantRow = { id: crypto.randomUUID(), ...values, created_at: Date.now() };
      rows.push(row);
      return Promise.resolve(row) as never;
    },
    findByUserAndPeriod(userId: number) {
      return Promise.resolve(rows.filter((r) => r.user_id === userId));
    },
  };
}

export function makeSearchUsageReservationsRepo() {
  const rows: ReservationRow[] = [];
  return {
    rows,
    insert(values: { user_id: number; amount: number; reason: string }) {
      const id = crypto.randomUUID();
      const now = Date.now();
      const row: ReservationRow = { id, ...values, status: "pending", created_at: now, updated_at: now };
      rows.push(row);
      return Promise.resolve({ id });
    },
    findById(id: string) {
      return Promise.resolve(rows.find((r) => r.id === id));
    },
    updateStatus(id: string, status: "committed" | "cancelled" | "expired") {
      const row = rows.find((r) => r.id === id);
      if (row) row.status = status;
      return Promise.resolve(undefined) as never;
    },
    findByUserAndPeriod(userId: number) {
      return Promise.resolve(rows.filter((r) => r.user_id === userId));
    },
  };
}

export function makeSearchUsageCommitsRepo() {
  const rows: CommitRow[] = [];
  return {
    rows,
    insert(values: { reservation_id: string; amount: number }) {
      const row: CommitRow = { id: crypto.randomUUID(), ...values, created_at: Date.now() };
      rows.push(row);
      return Promise.resolve(row) as never;
    },
    findByReservation(reservationId: string) {
      return Promise.resolve(rows.filter((r) => r.reservation_id === reservationId));
    },
    findByUserAndPeriod() {
      return Promise.resolve(rows);
    },
  };
}

export function makeLeadCapacityGrantsRepo() {
  const rows: GrantRow[] = [];
  return {
    rows,
    insert(values: { user_id: number; amount: number; reason: string; actor_user_id: number }) {
      const row: GrantRow = { id: crypto.randomUUID(), ...values, created_at: Date.now() };
      rows.push(row);
      return Promise.resolve(row) as never;
    },
    findByUserAndDate(userId: number) {
      return Promise.resolve(rows.filter((r) => r.user_id === userId));
    },
  };
}

export function makeLeadUsageReservationsRepo() {
  const rows: ReservationRow[] = [];
  return {
    rows,
    insert(values: { user_id: number; amount: number; reason: string }) {
      const id = crypto.randomUUID();
      const now = Date.now();
      const row: ReservationRow = { id, ...values, status: "pending", created_at: now, updated_at: now };
      rows.push(row);
      return Promise.resolve({ id });
    },
    findById(id: string) {
      return Promise.resolve(rows.find((r) => r.id === id));
    },
    updateStatus(id: string, status: "committed" | "cancelled" | "expired") {
      const row = rows.find((r) => r.id === id);
      if (row) row.status = status;
      return Promise.resolve(undefined) as never;
    },
    findByUserAndDate(userId: number) {
      return Promise.resolve(rows.filter((r) => r.user_id === userId));
    },
  };
}

export function makeLeadUsageCommitsRepo() {
  const rows: CommitRow[] = [];
  return {
    rows,
    insert(values: { reservation_id: string; amount: number }) {
      const row: CommitRow = { id: crypto.randomUUID(), ...values, created_at: Date.now() };
      rows.push(row);
      return Promise.resolve(row) as never;
    },
    findByReservation(reservationId: string) {
      return Promise.resolve(rows.filter((r) => r.reservation_id === reservationId));
    },
    findByUserAndDate() {
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
      upsert: async () => undefined as never,
    },
    searchPolicyOverrides: {
      findActiveForUser: async () => undefined,
      listActiveForUsers: async () => [],
      replaceForUser: async () => undefined as never,
    },
  };
}

export function makeNullLeadPolicyRepos() {
  return {
    leadPolicyDefaults: {
      findForScope: async () => undefined,
      listForScope: async () => [],
      upsert: async () => undefined as never,
    },
    leadPolicyOverrides: {
      findActiveForUser: async () => undefined,
      listActiveForUsers: async () => [],
      replaceForUser: async () => undefined as never,
    },
  };
}
