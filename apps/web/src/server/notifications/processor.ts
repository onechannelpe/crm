import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { createLogger } from "~/lib/observability/logger";

import { deliverExternal, deliverInApp } from "./delivery-executor";
import { planDeliveries } from "./delivery-planner";
import type { MessagingGateway } from "./messaging-gateway";

const logger = createLogger("notifications-processor");

async function leaseOutboxBatch(
  db: Kysely<Database>,
  workerId: string,
  now: number,
  limit: number,
): Promise<string[]> {
  const candidates = await db
    .selectFrom("notification_outbox")
    .select("id")
    .where("status", "=", "pending")
    .where("available_at", "<=", now)
    .where((eb) =>
      eb.or([eb("lease_until", "is", null), eb("lease_until", "<", now)]),
    )
    .orderBy("created_at", "asc")
    .limit(limit)
    .execute();

  if (candidates.length === 0) return [];

  const ids = candidates.map((candidate) => candidate.id);

  await db
    .updateTable("notification_outbox")
    .set((eb) => ({
      status: "processing",
      lease_owner: workerId,
      lease_until: now + 30_000,
      attempt_count: eb("attempt_count", "+", 1),
    }))
    .where("id", "in", ids)
    .where("status", "=", "pending")
    .execute();

  const leased = await db
    .selectFrom("notification_outbox")
    .select("id")
    .where("id", "in", ids)
    .where("lease_owner", "=", workerId)
    .execute();

  return leased.map((row) => row.id);
}

async function markOutboxDone(
  db: Kysely<Database>,
  entryId: string,
  now: number,
): Promise<void> {
  await db
    .updateTable("notification_outbox")
    .set({
      status: "done",
      processed_at: now,
      lease_owner: null,
      lease_until: null,
      error: null,
    })
    .where("id", "=", entryId)
    .execute();
}

async function markOutboxFailed(
  db: Kysely<Database>,
  entryId: string,
  error: unknown,
): Promise<void> {
  await db
    .updateTable("notification_outbox")
    .set({
      status: "failed",
      processed_at: Date.now(),
      lease_owner: null,
      lease_until: null,
      error: String(error),
    })
    .where("id", "=", entryId)
    .execute();
}

export function createNotificationProcessor(
  db: Kysely<Database>,
  messaging: Pick<MessagingGateway, "sendCampaignEmail" | "sendWhatsAppText">,
) {
  return async function runOnce(workerId: string, limit = 50): Promise<void> {
    const now = Date.now();
    const ids = await leaseOutboxBatch(db, workerId, now, limit);
    if (ids.length === 0) return;

    const entries = await db
      .selectFrom("notification_outbox")
      .selectAll()
      .where("id", "in", ids)
      .where("lease_owner", "=", workerId)
      .execute();

    /* eslint-disable no-await-in-loop -- Sequential delivery bounds provider concurrency. */
    for (const entry of entries) {
      try {
        const planned = await planDeliveries(
          db,
          {
            id: entry.id,
            event_type: entry.event_type,
            audience_json: entry.audience_json,
            channels_json: entry.channels_json,
          },
          now,
        );

        logger.info("intent_processing", {
          id: entry.id,
          event_type: entry.event_type,
          recipient_count: planned.recipients.length,
        });

        await deliverInApp(db, entry, planned.inAppRecipients, now);

        for (const delivery of planned.externalDeliveries) {
          await deliverExternal(db, entry, delivery, messaging, now);
        }

        await markOutboxDone(db, entry.id, now);
      } catch (error) {
        logger.error("intent_failed", { id: entry.id, error: String(error) });
        await markOutboxFailed(db, entry.id, error);
      }
    }
    /* eslint-enable no-await-in-loop */
  };
}
