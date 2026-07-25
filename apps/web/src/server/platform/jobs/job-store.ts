import type { Kysely } from "kysely";

import type { DatabaseExecutor } from "~/server/platform/database/executor";

import { CLAIMABLE_STATES, type JobTableName } from "./registry";

export type DomainPatch = Record<
  string,
  string | number | boolean | Date | null
>;

interface QueueControlColumns {
  id: string | number;
  queue_state: string;
  lease_owner: string | null;
  claimable_at: Date;
  attempt_count: number;
  max_attempts: number;
  error_message: string | null;
  completed_at: Date | null;
}

type QueueControlDb = Record<JobTableName, QueueControlColumns>;

export interface JobStore<TId extends string | number, TRow> {
  claim(
    workerId: string,
    now: Date,
    limit: number,
    leaseMs: number,
  ): Promise<TRow[]>;

  extendLease(
    id: TId,
    workerId: string,
    leaseMs: number,
    now: Date,
  ): Promise<boolean>;

  markDone(
    id: TId,
    workerId: string,
    now: Date,
    patch?: DomainPatch,
  ): Promise<boolean>;

  scheduleRetry(
    id: TId,
    workerId: string,
    claimableAt: Date,
    reason: string | null,
    patch?: DomainPatch,
  ): Promise<boolean>;

  markFailed(
    id: TId,
    workerId: string,
    now: Date,
    reason: string,
    patch?: DomainPatch,
  ): Promise<boolean>;

  countOutstanding(): Promise<number>;
}

export function createJobStore<
  TRow,
  TId extends string | number = string | number,
>(
  executor: DatabaseExecutor,
  table: JobTableName,
  selectColumns: readonly string[],
): JobStore<TId, TRow> {
  // The table is chosen at runtime, so cast to the shared queue columns.
  // oxlint-disable-next-line no-unsafe-type-assertion
  const db = executor as unknown as Kysely<QueueControlDb>;

  async function settle(
    id: TId,
    workerId: string,
    patch: DomainPatch,
  ): Promise<boolean> {
    const result = await db
      .updateTable(table)
      .set(patch)
      .where("id", "=", id)
      .where("lease_owner", "=", workerId)
      .where("queue_state", "=", "processing")
      .executeTakeFirst();

    return Number(result.numUpdatedRows ?? 0) > 0;
  }

  return {
    async claim(workerId, now, limit, leaseMs) {
      const projection = selectColumns.map((column) =>
        column === "id" ? `${table}.id` : column,
      );

      const rows = await db
        .with("claimed", (qb) =>
          qb
            .selectFrom(table)
            .select("id")
            .where(CLAIMABLE_STATES)
            .where("claimable_at", "<=", now)
            // Prevent a worker crash from reclaiming the same poison job forever.
            .whereRef("attempt_count", "<", "max_attempts")
            .orderBy("claimable_at", "asc")
            .limit(limit)
            .forUpdate()
            .skipLocked(),
        )
        .updateTable(table)
        .from("claimed")
        .set((eb) => ({
          queue_state: "processing",
          lease_owner: workerId,
          claimable_at: new Date(now.getTime() + leaseMs),
          attempt_count: eb("attempt_count", "+", 1),
          error_message: null,
        }))
        .whereRef(`${table}.id`, "=", "claimed.id")
        // oxlint-disable-next-line no-unsafe-type-assertion
        .returning(projection as never[])
        .execute();

      // oxlint-disable-next-line no-unsafe-type-assertion
      return rows as TRow[];
    },

    async extendLease(id, workerId, leaseMs, now) {
      const result = await db
        .updateTable(table)
        .set({ claimable_at: new Date(now.getTime() + leaseMs) })
        .where("id", "=", id)
        // A reclaimed job must not be extended by its previous owner.
        .where("lease_owner", "=", workerId)
        .where("queue_state", "=", "processing")
        .executeTakeFirst();

      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    markDone(id, workerId, now, patch) {
      return settle(id, workerId, {
        queue_state: "done",
        lease_owner: null,
        completed_at: now,
        error_message: null,
        ...patch,
      });
    },

    scheduleRetry(id, workerId, claimableAt, reason, patch) {
      return settle(id, workerId, {
        queue_state: "pending",
        claimable_at: claimableAt,
        lease_owner: null,
        error_message: reason,
        ...patch,
      });
    },

    markFailed(id, workerId, now, reason, patch) {
      return settle(id, workerId, {
        queue_state: "failed",
        lease_owner: null,
        completed_at: now,
        error_message: reason,
        ...patch,
      });
    },

    async countOutstanding() {
      const row = await db
        .selectFrom(table)
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .where("queue_state", "in", ["pending", "processing"])
        .executeTakeFirstOrThrow();

      return row.count;
    },
  };
}
