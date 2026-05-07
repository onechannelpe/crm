import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { createLogger } from "~/lib/observability/logger";

import { resolveAudience } from "./audience";
import type { MessagingGateway } from "./messaging-gateway";
import type { NotificationAudience, NotificationChannel } from "./types";

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

  const ids = candidates.map((c) => c.id);

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

  return leased.map((r) => r.id);
}

async function deliverInApp(
  db: Kysely<Database>,
  entry: {
    id: string;
    event_type: string;
    title: string;
    body_text: string;
    action_url: string | null;
    priority: "high" | "normal" | "low";
  },
  recipients: number[],
  now: number,
): Promise<void> {
  if (recipients.length === 0) return;

  const inserted = await db
    .insertInto("app_notifications")
    .values(
      recipients.map((userId) => ({
        user_id: userId,
        source_event_id: entry.id,
        event_type: entry.event_type,
        priority: entry.priority,
        title: entry.title,
        body_text: entry.body_text,
        action_url: entry.action_url,
        metadata_json: null,
        created_at: now,
        read_at: null,
      })),
    )
    .onConflict((oc) => oc.columns(["user_id", "source_event_id"]).doNothing())
    .execute();

  const insertedCount = Array.isArray(inserted)
    ? inserted.reduce(
        (sum, r) => sum + Number(r.numInsertedOrUpdatedRows ?? 0),
        0,
      )
    : Number(
        (inserted as { numInsertedOrUpdatedRows?: bigint | number })
          .numInsertedOrUpdatedRows ?? 0,
      );

  logger.info("in_app_delivered", {
    id: entry.id,
    recipients: recipients.length,
    inserted: insertedCount,
    deduped: recipients.length - insertedCount,
  });
}

async function deliverExternal(
  db: Kysely<Database>,
  entry: { id: string; title: string; body_text: string },
  userId: number,
  channel: "email" | "whatsapp",
  messaging: Pick<MessagingGateway, "sendCampaignEmail" | "sendWhatsAppText">,
  now: number,
): Promise<void> {
  const row = await db
    .selectFrom("user_channel_addresses")
    .select("address")
    .where("user_id", "=", userId)
    .where("channel", "=", channel)
    .where("is_verified", "=", 1)
    .executeTakeFirst();

  if (!row) return;

  const receipt =
    channel === "email"
      ? await messaging.sendCampaignEmail({
          to: row.address,
          params: {
            title: entry.title,
            bodyText: entry.body_text,
            platformName: "CRM",
          },
        })
      : await messaging.sendWhatsAppText({
          to: row.address,
          body: entry.body_text,
        });

  await db
    .insertInto("notification_deliveries")
    .values({
      intent_id: entry.id,
      recipient_channel: channel,
      recipient_address: row.address,
      provider: receipt.ok
        ? receipt.value.provider
        : channel === "email"
          ? "resend"
          : "whatsapp_cloud",
      provider_message_id: receipt.ok
        ? (receipt.value.providerMessageId ?? null)
        : null,
      status: receipt.ok ? "sent" : "failed",
      error_code: receipt.ok ? null : receipt.error.code,
      error_message: receipt.ok ? null : receipt.error.message,
      latency_ms: null,
      created_at: now,
    })
    .execute();

  logger.info(receipt.ok ? "external_delivered" : "external_failed", {
    id: entry.id,
    channel,
    userId,
  });
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

    /* eslint-disable no-await-in-loop */
    for (const entry of entries) {
      try {
        // oxlint-disable-next-line no-unsafe-type-assertion
        const audience = JSON.parse(
          entry.audience_json,
        ) as NotificationAudience;
        // oxlint-disable-next-line no-unsafe-type-assertion
        const channels = JSON.parse(
          entry.channels_json,
        ) as NotificationChannel[];
        const recipients = await resolveAudience(db, audience);

        logger.info("intent_processing", {
          id: entry.id,
          event_type: entry.event_type,
          recipient_count: recipients.length,
        });

        for (const channel of channels) {
          if (channel === "in_app") {
            await deliverInApp(db, entry, recipients, now);
          } else {
            for (const userId of recipients) {
              await deliverExternal(db, entry, userId, channel, messaging, now);
            }
          }
        }

        await db
          .updateTable("notification_outbox")
          .set({
            status: "done",
            processed_at: now,
            lease_owner: null,
            lease_until: null,
            error: null,
          })
          .where("id", "=", entry.id)
          .execute();
      } catch (error) {
        logger.error("intent_failed", { id: entry.id, error: String(error) });
        await db
          .updateTable("notification_outbox")
          .set({
            status: "failed",
            processed_at: Date.now(),
            lease_owner: null,
            lease_until: null,
            error: String(error),
          })
          .where("id", "=", entry.id)
          .execute();
      }
    }
    /* eslint-enable no-await-in-loop */
  };
}
