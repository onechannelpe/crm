import type { Kysely } from "kysely";

import type { DatabaseExecutor } from "~/server/shared/db-executor";

// The four queue-lifecycle states every job table shares. This column is owned
// solely by the job-store. Any user-facing `status` a feature surfaces is a
// separate domain column the store never reads or writes except through an
// explicit caller patch.
export type QueueState = "pending" | "processing" | "done" | "failed";

// Tables that carry the canonical control columns and are driven by a queue.
export type JobTableName =
  | "notification_outbox"
  | "notification_deliveries"
  | "search_enrichment_jobs"
  | "search_enrichment_completion_outbox"
  | "workflow_integration_jobs"
  | "report_export_jobs";

// Domain columns a caller wants written in the same statement as a queue
// transition (a user-facing `status`, a `completed_at`, an error message). Kept
// loose on purpose: this is the one boundary where the generic store cannot know
// a specific table's domain shape, so each queue passes its own typed object and
// the store merges it verbatim.
export type DomainPatch = Record<string, string | number | null>;

export interface JobStore<TId extends string | number, TRow> {
  claimPending(
    workerId: string,
    now: number,
    limit: number,
    leaseMs: number,
    claimPatch?: DomainPatch,
  ): Promise<TRow[]>;
  extendLease(
    id: TId,
    workerId: string,
    leaseMs: number,
    now: number,
  ): Promise<boolean>;
  scheduleRetry(id: TId, availableAt: number, patch?: DomainPatch): Promise<void>;
  markDone(id: TId, patch?: DomainPatch): Promise<void>;
  markFailed(id: TId, patch?: DomainPatch): Promise<void>;
}

/**
 * The single owner of the claim/lease/retry/settle state machine, generic over
 * any job table. Each queue supplies its table, the projection its handler needs
 * (`selectColumns`, the keys of `TRow`), and optional domain patches for the
 * columns the store does not own. There is exactly one place this logic lives,
 * so adding a stage is a config call rather than a re-implementation.
 *
 * Kysely resolves column names from the static table type, but `table` is chosen
 * per queue at runtime, so the builder is typed loosely inside this module. The
 * cast is sound because every `JobTableName` carries the control columns by
 * schema; this function is the single owner of that invariant.
 */
export function createJobStore<
  TRow,
  TId extends string | number = string | number,
>(
  executor: DatabaseExecutor,
  table: JobTableName,
  selectColumns: readonly string[],
): JobStore<TId, TRow> {
  const db = executor as unknown as Kysely<Record<string, never>>;
  const from = table as never;
  const cols = selectColumns as never;

  return {
    async claimPending(workerId, now, limit, leaseMs, claimPatch) {
      const candidates = await db
        .selectFrom(from)
        .select("id" as never)
        .where("queue_state" as never, "=", "pending" as never)
        .where("available_at" as never, "<=", now as never)
        .where((eb) =>
          eb.or([
            eb("lease_until" as never, "is", null),
            eb("lease_until" as never, "<", now as never),
          ]),
        )
        .orderBy("available_at" as never, "asc")
        .limit(limit)
        .execute();
      if (candidates.length === 0) return [];

      const ids = candidates.map((row) => (row as { id: TId }).id);
      await db
        .updateTable(from)
        .set((eb) => ({
          queue_state: "processing",
          lease_owner: workerId,
          lease_until: now + leaseMs,
          attempt_count: eb("attempt_count" as never, "+", 1),
          ...claimPatch,
        }) as never)
        // Re-check the claim predicate in the UPDATE so two workers that read the
        // same candidate row cannot both lease it.
        .where("id" as never, "in", ids as never)
        .where("queue_state" as never, "=", "pending" as never)
        .where("available_at" as never, "<=", now as never)
        .where((eb) =>
          eb.or([
            eb("lease_until" as never, "is", null),
            eb("lease_until" as never, "<", now as never),
          ]),
        )
        .execute();

      const rows = await db
        .selectFrom(from)
        .select(cols)
        .where("id" as never, "in", ids as never)
        .where("lease_owner" as never, "=", workerId as never)
        .where("queue_state" as never, "=", "processing" as never)
        .execute();
      return rows as TRow[];
    },

    async extendLease(id, workerId, leaseMs, now) {
      const result = await db
        .updateTable(from)
        .set({ lease_until: now + leaseMs } as never)
        .where("id" as never, "=", id as never)
        .where("lease_owner" as never, "=", workerId as never)
        .where("queue_state" as never, "=", "processing" as never)
        .executeTakeFirst();
      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    async scheduleRetry(id, availableAt, patch) {
      await db
        .updateTable(from)
        .set({
          queue_state: "pending",
          available_at: availableAt,
          lease_owner: null,
          lease_until: null,
          ...patch,
        } as never)
        .where("id" as never, "=", id as never)
        .execute();
    },

    async markDone(id, patch) {
      await db
        .updateTable(from)
        .set({
          queue_state: "done",
          lease_owner: null,
          lease_until: null,
          ...patch,
        } as never)
        .where("id" as never, "=", id as never)
        .execute();
    },

    async markFailed(id, patch) {
      await db
        .updateTable(from)
        .set({
          queue_state: "failed",
          lease_owner: null,
          lease_until: null,
          ...patch,
        } as never)
        .where("id" as never, "=", id as never)
        .execute();
    },
  };
}
