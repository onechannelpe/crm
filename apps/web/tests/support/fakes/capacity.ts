import {
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from "kysely";

import type { Database } from "~/lib/db/types";
import { getLeadCapacitySnapshot } from "~/server/capacity/application/queries/get-lead-capacity-snapshot";
import { getSearchCapacitySnapshot } from "~/server/capacity/application/queries/get-search-capacity-snapshot";
import type { UsageReservationPorts } from "~/server/capacity/application/usage/ledger";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import {
  asLeadReservationId,
  asSearchReservationId,
  type LeadReservationId,
  type SearchReservationId,
  type UserId,
} from "~/server/shared/ids";
import { isErr, Ok } from "~/server/shared/result";
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

function createTransactionExecutor(): DatabaseExecutor {
  return new Kysely<Database>({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => new DummyDriver(),
      createIntrospector: (db) => new PostgresIntrospector(db),
      createQueryCompiler: () => new PostgresQueryCompiler(),
    },
  });
}

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
    updateAmountAndStatus(
      id: SearchReservationId,
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
    findByUserAndPeriod(
      userId: UserId,
      _periodStart?: string,
      _periodEnd?: string,
    ): Promise<SearchReservationRow[]> {
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

// Policy repos with no overrides, so capacity tests use system defaults.
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

type SearchReservationTestRepos = Parameters<
  typeof getSearchCapacitySnapshot
>[1] & {
  searchUsageReservations: ReturnType<typeof makeSearchUsageReservationsRepo>;
  searchUsageCommits: ReturnType<typeof makeSearchUsageCommitsRepo>;
};

export function makeSearchUsageReservationPorts(
  repos: SearchReservationTestRepos,
): UsageReservationPorts<"search"> {
  return {
    executor: createTransactionExecutor(),
    async checkRemaining(_trx, actorUserId) {
      const snapshot = await getSearchCapacitySnapshot(actorUserId, repos);
      if (isErr(snapshot)) return snapshot;
      return Ok(snapshot.value.remaining);
    },
    reservations: () => repos.searchUsageReservations,
    commits: () => repos.searchUsageCommits,
  };
}

type LeadReservationTestRepos = Parameters<
  typeof getLeadCapacitySnapshot
>[1] & {
  leadUsageReservations: ReturnType<typeof makeLeadUsageReservationsRepo>;
  leadUsageCommits: ReturnType<typeof makeLeadUsageCommitsRepo>;
};

export function makeLeadUsageReservationPorts(
  repos: LeadReservationTestRepos,
): UsageReservationPorts<"lead"> {
  return {
    executor: createTransactionExecutor(),
    async checkRemaining(_trx, actorUserId) {
      const snapshot = await getLeadCapacitySnapshot(actorUserId, repos);
      if (isErr(snapshot)) return snapshot;
      return Ok(snapshot.value.remaining);
    },
    reservations: () => repos.leadUsageReservations,
    commits: () => repos.leadUsageCommits,
  };
}
