import type { Logger } from "~/lib/observability/logger-shared";

import {
  parseNotificationAudience,
  parseNotificationChannels,
} from "./outbox-payload";
import type { NotificationAudience, NotificationChannel } from "./types";

export type NotificationOutboxEntry = {
  id: string;
  event_type: string;
  audience_json: string;
  channels_json: string;
};

export type PlannedExternalDelivery = {
  userId: number;
  channel: "email" | "whatsapp";
  recipientAddress: string;
};

export type PlannedDeliveries = {
  recipients: number[];
  inAppRecipients: number[];
  externalDeliveries: PlannedExternalDelivery[];
};

export interface NotificationPlanningRepository {
  resolveAudience(audience: NotificationAudience): Promise<number[]>;
  findVerifiedAddresses(
    userIds: number[],
    channel: Exclude<NotificationChannel, "in_app">,
  ): Promise<Map<number, string>>;
  findActiveWhatsAppUsers(userIds: number[], now: number): Promise<Set<number>>;
}

export function createNotificationPlanner(deps: {
  repository: NotificationPlanningRepository;
  logger: Pick<Logger, "info">;
}) {
  return async function planDeliveries(
    entry: NotificationOutboxEntry,
    now: number,
  ): Promise<PlannedDeliveries> {
    const audience = parseNotificationAudience(entry.audience_json);
    const channels = parseNotificationChannels(entry.channels_json);
    const recipients = await deps.repository.resolveAudience(audience);
    const inAppRecipients = channels.includes("in_app") ? recipients : [];
    const externalChannels = channels.filter(
      (channel): channel is "email" | "whatsapp" => channel !== "in_app",
    );

    const [addressMaps, activeWhatsAppUsers] = await Promise.all([
      Promise.all(
        externalChannels.map(async (channel) => ({
          channel,
          addresses: await deps.repository.findVerifiedAddresses(
            recipients,
            channel,
          ),
        })),
      ),
      externalChannels.includes("whatsapp")
        ? deps.repository.findActiveWhatsAppUsers(recipients, now)
        : Promise.resolve(new Set<number>()),
    ]);

    const externalDeliveries: PlannedExternalDelivery[] = [];
    for (const { channel, addresses } of addressMaps) {
      for (const userId of recipients) {
        if (channel === "whatsapp" && !activeWhatsAppUsers.has(userId)) {
          deps.logger.info("whatsapp_skipped_no_session", {
            userId,
            reason: "no_active_session",
          });
          continue;
        }

        const recipientAddress = addresses.get(userId);
        if (!recipientAddress) {
          if (channel === "whatsapp") {
            deps.logger.info("whatsapp_skipped_no_address", {
              userId,
              reason: "no_verified_address",
            });
          }
          continue;
        }

        externalDeliveries.push({ userId, channel, recipientAddress });
      }
    }

    return { recipients, inAppRecipients, externalDeliveries };
  };
}
