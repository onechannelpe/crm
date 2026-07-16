import type { Kysely } from "kysely";

import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { JOB_TABLE_LIFECYCLE, type JobTableName } from "./registry";

export type QueueState = "pending" | "processing" | "done" | "failed";

export type { JobTableName };

// Domain fields written atomically with a queue transition. The store owns lifecycle fields.
export type DomainPatch = Record<
  string,
  string | number | boolean | Date | null
>;

// e.g. workflow_integration_jobs carries both imports and exports; a queue
// restricts its claim to one kind by setting this.
export interface ClaimFilter {
  column: string;
  values: readonly (string | number)[];
}

// A table with no user-facing status (the outbox) configures none of these.
export interface LifecycleColumns {
  // Stamped with the settle clock on done and fail (e.g. `completed_at`,
  // `sent_at`, `processed_at`, `expanded_at`).
  finishedAt?: string;
  // Carries the failure/retry reason; cleared on done (e.g. `error_message`,
  // `last_error`).
  error?: string;
  // Mirrors `queue_state` 1:1. The store writes the matching value on every
  // transition so the UI can keep polling it.
  status?: {
    column: string;
    pending: string;
    processing: string;
    done: string;
    failed: string;
  };
}

// Stale-lease recovery shares this mapping so status mirrors follow queue state.
export function mirrorPatch(
  lifecycle: LifecycleColumns,
  state: QueueState,
  opts: { finishedAt?: Date; error?: string | null } = {},
): DomainPatch {
  const patch: DomainPatch = {};
  if (lifecycle.finishedAt && opts.finishedAt !== undefined) {
    patch[lifecycle.finishedAt] = opts.finishedAt;
  }
  if (lifecycle.error && opts.error !== undefined) {
    patch[lifecycle.error] = opts.error;
  }
  if (lifecycle.status) {
    patch[lifecycle.status.column] = lifecycle.status[state];
  }
  return patch;
}

export interface JobStore<TId extends string | number, TRow> {
  claim(
    workerId: string,
    now: Date,
    limit: number,
    leaseMs: number,
    filter?: ClaimFilter,
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
    availableAt: Date,
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

// Claim with SKIP LOCKED. Settle only while the worker owns the processing lease.
export function createJobStore<
  TRow,
  TId extends string | number = string | number,
>(
  executor: DatabaseExecutor,
  table: JobTableName,
  selectColumns: readonly string[],
): JobStore<TId, TRow> {
  // The Kysely handle is untyped because `table` is per-queue at runtime; the
  // public JobStore API is typed via TRow.
  // oxlint-disable-next-line no-unsafe-type-assertion
  const db = executor as unknown as Kysely<any>;
  const lifecycle = JOB_TABLE_LIFECYCLE[table];

  const mirror = (
    state: QueueState,
    opts: { finishedAt?: Date; error?: string | null },
  ): DomainPatch => mirrorPatch(lifecycle, state, opts);

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
    async claim(workerId, now, limit, leaseMs, filter) {
      const leaseUntil = new Date(now.getTime() + leaseMs);

      const rows = await db
        .with("claimed", (qb) => {
          let candidate = qb
            .selectFrom(table)
            .select("id")
            .where("queue_state", "=", "pending")
            .where("available_at", "<=", now);
          if (filter) {
            candidate = candidate.where(filter.column, "in", filter.values);
          }
          return candidate
            .orderBy("available_at", "asc")
            .limit(limit)
            .forUpdate()
            .skipLocked();
        })
        .updateTable(table)
        .from("claimed")
        .set((eb) => ({
          queue_state: "processing",
          lease_owner: workerId,
          lease_until: leaseUntil,
          attempt_count: eb("attempt_count", "+", 1),
          // A fresh attempt starts with a clean error mirror.
          ...mirror("processing", { error: null }),
        }))
        .whereRef(`${table}.id`, "=", "claimed.id")
        // Postgres UPDATE...FROM RETURNING sees both `claimed.id` and the
        // target table's `id`; qualify to disambiguate.
        .returning(
          selectColumns.map((column) =>
            column === "id" ? `${table}.id` : column,
          ),
        )
        .execute();

      // oxlint-disable-next-line no-unsafe-type-assertion
      return rows as TRow[];
    },

    async extendLease(id, workerId, leaseMs, now) {
      const result = await db
        .updateTable(table)
        .set({ lease_until: new Date(now.getTime() + leaseMs) })
        .where("id", "=", id)
        .where("lease_owner", "=", workerId)
        .where("queue_state", "=", "processing")
        .executeTakeFirst();
      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    markDone(id, workerId, now, patch) {
      return settle(id, workerId, {
        queue_state: "done",
        lease_owner: null,
        lease_until: null,
        ...mirror("done", { finishedAt: now, error: null }),
        ...patch,
      });
    },

    scheduleRetry(id, workerId, availableAt, reason, patch) {
      return settle(id, workerId, {
        queue_state: "pending",
        available_at: availableAt,
        lease_owner: null,
        lease_until: null,
        ...mirror("pending", { error: reason }),
        ...patch,
      });
    },

    markFailed(id, workerId, now, reason, patch) {
      return settle(id, workerId, {
        queue_state: "failed",
        lease_owner: null,
        lease_until: null,
        ...mirror("failed", { finishedAt: now, error: reason }),
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

// Requeue expired processing leases with the same lifecycle mapping as settle.
export async function resetStaleLeases(
  executor: DatabaseExecutor,
  table: JobTableName,
  now: Date,
): Promise<number> {
  // oxlint-disable-next-line no-unsafe-type-assertion
  const db = executor as unknown as Kysely<any>;
  const result = await db
    .updateTable(table)
    .set({
      queue_state: "pending",
      lease_owner: null,
      lease_until: null,
      ...mirrorPatch(JOB_TABLE_LIFECYCLE[table], "pending"),
    })
    .where("queue_state", "=", "processing")
    .where("lease_until", "<", now)
    .executeTakeFirst();
  return Number(result.numUpdatedRows ?? 0);
}
