import { sql } from "kysely";

import { db } from "~/lib/db/db";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { OutboxEvent } from "./types";

export async function enqueueOutboxEvents(
  executor: DatabaseExecutor,
  events: OutboxEvent[],
  now: number,
) {
  if (events.length < 1) return;

  await executor
    .insertInto("pipeline_integration_outbox_events")
    .values(
      events.map((event) => ({
        topic: event.topic,
        payload_json: JSON.stringify(event),
        status: "pending",
        attempt_count: 0,
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

export async function claimOutboxEvents(input: {
  workerId: string;
  limit: number;
  leaseMs: number;
}) {
  const now = Date.now();
  const leaseUntil = now + input.leaseMs;

  const candidates = await db
    .selectFrom("pipeline_integration_outbox_events")
    .select("id")
    .where("status", "=", "pending")
    .where("available_at", "<=", now)
    .where((eb) =>
      eb.or([eb("lease_until", "is", null), eb("lease_until", "<", now)]),
    )
    .orderBy("created_at", "asc")
    .limit(input.limit)
    .execute();

  if (candidates.length < 1) return [];

  const ids = candidates.map((row) => row.id);
  await db
    .updateTable("pipeline_integration_outbox_events")
    .set({
      status: "processing",
      lease_owner: input.workerId,
      lease_until: leaseUntil,
      attempt_count: sql<number>`attempt_count + 1`,
    })
    .where("id", "in", ids)
    .where("status", "=", "pending")
    .execute();

  return db
    .selectFrom("pipeline_integration_outbox_events")
    .selectAll()
    .where("id", "in", ids)
    .where("status", "=", "processing")
    .where("lease_owner", "=", input.workerId)
    .execute();
}

export async function completeOutboxEvent(id: number) {
  await db
    .updateTable("pipeline_integration_outbox_events")
    .set({
      status: "completed",
      processed_at: Date.now(),
      lease_owner: null,
      lease_until: null,
      error_message: null,
    })
    .where("id", "=", id)
    .execute();
}

export async function failOutboxEvent(input: {
  id: number;
  attemptCount: number;
  errorMessage: string;
}) {
  const availableAt = Date.now() + Math.min(30_000, input.attemptCount * 2_000);
  const failed = input.attemptCount >= 5;

  await db
    .updateTable("pipeline_integration_outbox_events")
    .set({
      status: failed ? "failed" : "pending",
      available_at: availableAt,
      lease_owner: null,
      lease_until: null,
      error_message: input.errorMessage,
    })
    .where("id", "=", input.id)
    .execute();
}
