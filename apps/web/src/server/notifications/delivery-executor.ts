import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { createLogger } from "~/lib/observability/logger";

import type { PlannedExternalDelivery } from "./delivery-planner";
import type { MessagingGateway } from "./messaging-gateway";

const logger = createLogger("notifications-processor");

export async function deliverInApp(
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
        (sum, row) => sum + Number(row.numInsertedOrUpdatedRows ?? 0),
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

export async function deliverExternal(
  db: Kysely<Database>,
  entry: { id: string; title: string; body_text: string },
  delivery: PlannedExternalDelivery,
  messaging: Pick<MessagingGateway, "sendCampaignEmail" | "sendWhatsAppText">,
  now: number,
): Promise<void> {
  const receipt =
    delivery.channel === "email"
      ? await messaging.sendCampaignEmail({
          to: delivery.recipientAddress,
          params: {
            title: entry.title,
            bodyText: entry.body_text,
            platformName: "Culqi360",
          },
        })
      : await messaging.sendWhatsAppText({
          to: delivery.recipientAddress,
          body: entry.body_text,
        });
  const provider = receipt.ok
    ? receipt.value.provider
    : receipt.error.kind === "provider_error"
      ? receipt.error.provider
      : null;

  await db
    .insertInto("notification_deliveries")
    .values({
      intent_id: entry.id,
      recipient_channel: delivery.channel,
      recipient_address: delivery.recipientAddress,
      provider,
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
    channel: delivery.channel,
    userId: delivery.userId,
  });
}
