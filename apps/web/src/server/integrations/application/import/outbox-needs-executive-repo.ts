import { sql } from "kysely";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { type UserId } from "~/server/shared/ids";

import { createOutboxStateRepo } from "./outbox-state-repo";
import type { NeedsExecutiveOutboxEvent } from "./types";

export async function enqueueNeedsExecutiveOutboxEvents(
  executor: DatabaseExecutor,
  events: NeedsExecutiveOutboxEvent[],
  now: number,
) {
  if (events.length < 1) return;

  await executor
    .insertInto("pipeline_integration_outbox_needs_executive_input")
    .values(
      events.map((event) => ({
        lead_id: event.leadId,
        ruc: event.ruc,
        executive_id: event.executiveId,
        status: "pending",
        attempt_count: 0,
        max_attempts: 5,
        available_at: now,
        lease_owner: null,
        lease_until: null,
        error_message: null,
        created_at: now,
        processed_at: null,
      })),
    )
    .execute();
}

export function createNeedsExecutiveOutboxRepo(executor: DatabaseExecutor) {
  const stateRepo = createOutboxStateRepo(
    executor,
    "pipeline_integration_outbox_needs_executive_input",
  );
  return {
    async claimPending(workerId: UserId, limit: number, leaseMs: number) {
      const now = Date.now();
      const leaseUntil = now + leaseMs;

      const candidates = await executor
        .selectFrom("pipeline_integration_outbox_needs_executive_input")
        .select("id")
        .where("status", "=", "pending")
        .where("available_at", "<=", now)
        .where((eb) =>
          eb.or([eb("lease_until", "is", null), eb("lease_until", "<", now)]),
        )
        .orderBy("created_at", "asc")
        .limit(limit)
        .execute();

      if (candidates.length < 1) {
        return [];
      }

      const ids = candidates.map((row) => row.id);
      await executor
        .updateTable("pipeline_integration_outbox_needs_executive_input")
        .set({
          status: "processing",
          lease_owner: workerId,
          lease_until: leaseUntil,
          attempt_count: sql<number>`attempt_count + 1`,
        })
        .where("id", "in", ids)
        .where("status", "=", "pending")
        .execute();

      return executor
        .selectFrom("pipeline_integration_outbox_needs_executive_input")
        .selectAll()
        .where("id", "in", ids)
        .where("status", "=", "processing")
        .where("lease_owner", "=", workerId)
        .execute();
    },
    extendLease: (id: number, workerId: UserId, leaseMs: number) =>
      stateRepo.extendLease(id, workerId, leaseMs),
    markCompleted: (id: number) => stateRepo.markCompleted(id),
    scheduleRetry: (id: number, availableAt: number) =>
      stateRepo.scheduleRetry(id, availableAt),
    markFailed: (id: number, reason: string) =>
      stateRepo.markFailed(id, reason),
  };
}

export type NeedsExecutiveOutboxRepo = ReturnType<
  typeof createNeedsExecutiveOutboxRepo
>;
