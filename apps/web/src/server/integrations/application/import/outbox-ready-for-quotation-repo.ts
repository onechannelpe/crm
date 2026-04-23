import { randomUUIDv7 } from "bun";
import { sql } from "kysely";

import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { createOutboxStateRepo } from "./outbox-state-repo";
import type { ReadyForQuotationOutboxEvent } from "./types";

export async function enqueueReadyForQuotationOutboxEvents(
  executor: DatabaseExecutor,
  events: ReadyForQuotationOutboxEvent[],
  now: number,
) {
  if (events.length < 1) return;

  await executor
    .insertInto("workflow_integration_outbox_ready_for_quotation")
    .values(
      events.map((event) => ({
        id: randomUUIDv7("hex", now),
        lead_id: event.leadId,
        ruc: event.ruc,
        branch_id: event.branchId,
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

export function createReadyForQuotationOutboxRepo(executor: DatabaseExecutor) {
  const stateRepo = createOutboxStateRepo(
    executor,
    "workflow_integration_outbox_ready_for_quotation",
  );
  return {
    async claimPending(workerId: string, limit: number, leaseMs: number) {
      const now = Date.now();
      const leaseUntil = now + leaseMs;

      const candidates = await executor
        .selectFrom("workflow_integration_outbox_ready_for_quotation")
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
        .updateTable("workflow_integration_outbox_ready_for_quotation")
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
        .selectFrom("workflow_integration_outbox_ready_for_quotation")
        .selectAll()
        .where("id", "in", ids)
        .where("status", "=", "processing")
        .where("lease_owner", "=", workerId)
        .execute();
    },
    extendLease: (id: string, workerId: string, leaseMs: number) =>
      stateRepo.extendLease(id, workerId, leaseMs),
    markCompleted: (id: string) => stateRepo.markCompleted(id),
    scheduleRetry: (id: string, availableAt: number) =>
      stateRepo.scheduleRetry(id, availableAt),
    markFailed: (id: string, reason: string) =>
      stateRepo.markFailed(id, reason),
  };
}

export type ReadyForQuotationOutboxRepo = ReturnType<
  typeof createReadyForQuotationOutboxRepo
>;
