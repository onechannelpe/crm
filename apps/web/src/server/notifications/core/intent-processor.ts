import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { createLogger } from "~/lib/observability/logger";
import type { MessagingGateway } from "~/server/notifications/messaging-gateway";

import { resolveChannelAddress, resolveRecipients } from "./audience-resolver";
import { safeParseUnknown } from "./json";
import type { Channel } from "./types";

const logger = createLogger("notifications-intent-processor");

function insertedRowCount(
  result:
    | { numInsertedOrUpdatedRows?: bigint | number }
    | Array<{ numInsertedOrUpdatedRows?: bigint | number }>,
): number {
  if (Array.isArray(result)) {
    return result.reduce((total, item) => total + insertedRowCount(item), 0);
  }
  if (typeof result.numInsertedOrUpdatedRows === "bigint") {
    return Number(result.numInsertedOrUpdatedRows);
  }
  if (typeof result.numInsertedOrUpdatedRows === "number") {
    return result.numInsertedOrUpdatedRows;
  }
  return 0;
}

function parseChannels(payload: string): Channel[] {
  const parsed = safeParseUnknown(payload);
  if (!Array.isArray(parsed)) return ["in_app"];
  const channels = parsed.filter(
    (value): value is Channel =>
      value === "in_app" || value === "email" || value === "whatsapp",
  );
  return channels.length > 0 ? channels : ["in_app"];
}

export function createNotificationIntentProcessor(
  db: Kysely<Database>,
  messaging: MessagingGateway,
) {
  return async function runOnce(workerId: string, limit = 50): Promise<void> {
    const now = Date.now();
    const leaseUntil = now + 30_000;
    const candidates = await db
      .selectFrom("notification_intents_outbox")
      .select("intent_id")
      .where("status", "=", "pending")
      .where("available_at", "<=", now)
      .where((eb) =>
        eb.or([eb("lease_until", "is", null), eb("lease_until", "<", now)]),
      )
      .orderBy("created_at", "asc")
      .limit(limit)
      .execute();

    if (candidates.length < 1) return;
    const ids = candidates.map((candidate) => candidate.intent_id);

    await db
      .updateTable("notification_intents_outbox")
      .set((eb) => ({
        status: "processing",
        lease_owner: workerId,
        lease_until: leaseUntil,
        attempt_count: eb("attempt_count", "+", 1),
      }))
      .where("intent_id", "in", ids)
      .where("status", "=", "pending")
      .execute();

    const intents = await db
      .selectFrom("notification_intents_outbox")
      .selectAll()
      .where("intent_id", "in", ids)
      .where("status", "=", "processing")
      .where("lease_owner", "=", workerId)
      .execute();

    for (const intent of intents) {
      try {
        const recipients = await resolveRecipients(
          db,
          intent.audience_kind,
          intent.audience_payload_json,
        );
        logger.info("recipient_resolved", {
          source_event_id: intent.source_event_id,
          intent_id: intent.intent_id,
          audience_kind: intent.audience_kind,
          recipient_count: recipients.length,
          aggregate_id: intent.aggregate_id,
        });

        const channels = parseChannels(intent.channel_set_json);
        if (channels.includes("in_app")) {
          const appInsert = await db
            .insertInto("app_notifications")
            .values(
              recipients.map((userId) => ({
                user_id: userId,
                intent_id: intent.intent_id,
                source_event_id: intent.source_event_id,
                event_type: intent.event_type,
                priority: intent.priority,
                title: intent.title,
                body_text: intent.body_text,
                action_url: intent.action_url,
                metadata_json: null,
                created_at: now,
                read_at: null,
              })),
            )
            .onConflict((oc) =>
              oc.columns(["user_id", "intent_id"]).doNothing(),
            )
            .execute();

          const appInserted = insertedRowCount(appInsert);
          if (appInserted < recipients.length) {
            logger.info("delivery_deduped", {
              source_event_id: intent.source_event_id,
              intent_id: intent.intent_id,
              channel: "in_app",
              audience_kind: intent.audience_kind,
              aggregate_id: intent.aggregate_id,
              deduped_count: recipients.length - appInserted,
            });
          }
        }

        for (const channel of channels) {
          if (channel === "in_app") continue;
          for (const userId of recipients) {
            const address = await resolveChannelAddress(db, userId, channel);
            if (!address) continue;

            const recipientInsert = await db
              .insertInto("notification_recipients")
              .values({
                intent_id: intent.intent_id,
                user_id: userId,
                channel,
                address,
                status: "pending",
                status_reason: null,
                created_at: now,
                sent_at: null,
                failed_at: null,
              })
              .onConflict((oc) =>
                oc.columns(["intent_id", "channel", "address"]).doNothing(),
              )
              .execute();

            if (insertedRowCount(recipientInsert) < 1) {
              logger.info("delivery_deduped", {
                source_event_id: intent.source_event_id,
                intent_id: intent.intent_id,
                channel,
                audience_kind: intent.audience_kind,
                aggregate_id: intent.aggregate_id,
                deduped_count: 1,
              });
              continue;
            }

            const receipt =
              channel === "email"
                ? await messaging.sendCampaignEmail({
                    to: address,
                    params: {
                      title: intent.title,
                      bodyText: intent.body_text,
                      platformName: "CRM",
                    },
                  })
                : await messaging.sendWhatsAppText({
                    to: address,
                    body: intent.body_text,
                  });

            await db
              .insertInto("notification_deliveries")
              .values({
                intent_id: intent.intent_id,
                recipient_channel: channel,
                recipient_address: address,
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

            logger.info(receipt.ok ? "delivery_sent" : "delivery_failed", {
              source_event_id: intent.source_event_id,
              intent_id: intent.intent_id,
              channel,
              audience_kind: intent.audience_kind,
              aggregate_id: intent.aggregate_id,
            });
          }
        }

        await db
          .updateTable("notification_intents_outbox")
          .set({
            status: "completed",
            processed_at: now,
            lease_owner: null,
            lease_until: null,
            error_message: null,
          })
          .where("intent_id", "=", intent.intent_id)
          .execute();
      } catch (error) {
        await db
          .updateTable("notification_intents_outbox")
          .set({
            status: "failed",
            processed_at: Date.now(),
            lease_owner: null,
            lease_until: null,
            error_message: String(error),
          })
          .where("intent_id", "=", intent.intent_id)
          .execute();
      }
    }
  };
}
