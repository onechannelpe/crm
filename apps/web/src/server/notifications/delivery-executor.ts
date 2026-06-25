import type { Logger } from "~/lib/observability/logger-shared";

import type { PlannedExternalDelivery } from "./delivery-planner";
import type { MessagingGateway } from "./messaging-gateway";
import type { NotificationDeliveryRepository } from "./repos/delivery";

type ExternalNotificationEntry = {
  id: string;
  title: string;
  body_text: string;
  action_url: string | null;
};

export function formatWhatsAppNotificationBody(
  entry: Pick<ExternalNotificationEntry, "body_text" | "action_url">,
  publicOrigin: string,
): string {
  if (entry.action_url === null) return entry.body_text;
  const actionUrl = new URL(entry.action_url, publicOrigin).toString();
  return `${entry.body_text} Revísalo en: ${actionUrl}`;
}

export function createNotificationDeliveryService(deps: {
  appNotifications: {
    createMany(
      values: Array<{
        user_id: number;
        source_event_id: string;
        event_type: string;
        priority: "high" | "normal" | "low";
        title: string;
        body_text: string;
        action_url: string | null;
        metadata_json: null;
        created_at: number;
        read_at: null;
      }>,
    ): Promise<void>;
  };
  deliveries: NotificationDeliveryRepository;
  messaging: Pick<MessagingGateway, "sendCampaignEmail" | "sendWhatsAppText">;
  publicOrigin: string;
  logger: Pick<Logger, "info">;
}) {
  return {
    async deliverInApp(
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

      await deps.appNotifications.createMany(
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
      );
    },

    async deliverExternal(
      entry: ExternalNotificationEntry,
      delivery: PlannedExternalDelivery,
      now: number,
    ): Promise<void> {
      const receipt =
        delivery.channel === "email"
          ? await deps.messaging.sendCampaignEmail({
              to: delivery.recipientAddress,
              params: {
                title: entry.title,
                bodyText: entry.body_text,
                platformName: "Culqi360",
              },
            })
          : await deps.messaging.sendWhatsAppText({
              to: delivery.recipientAddress,
              body: formatWhatsAppNotificationBody(entry, deps.publicOrigin),
            });
      const provider = receipt.ok
        ? receipt.value.provider
        : receipt.error.kind === "provider_error"
          ? receipt.error.provider
          : null;

      await deps.deliveries.record({
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
      });

      deps.logger.info(receipt.ok ? "external_delivered" : "external_failed", {
        id: entry.id,
        channel: delivery.channel,
        userId: delivery.userId,
      });
    },
  };
}

export type NotificationDeliveryService = ReturnType<
  typeof createNotificationDeliveryService
>;
