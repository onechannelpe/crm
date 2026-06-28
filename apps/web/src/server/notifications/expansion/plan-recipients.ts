import type { Logger } from "~/lib/observability/logger-shared";

import type { RecipientRepository } from "../repos/recipient-repo";
import type { NotificationAudience, NotificationChannel } from "../types";

export type PlannedExternalDelivery = {
  userId: number;
  channel: "email" | "whatsapp";
  recipientAddress: string;
};

export type RecipientPlan = {
  inAppRecipients: number[];
  externalDeliveries: PlannedExternalDelivery[];
};

export type RecipientPlannerInput = {
  audience: NotificationAudience;
  channels: NotificationChannel[];
};

export function createRecipientPlanner(deps: {
  repository: RecipientRepository;
  logger: Pick<Logger, "info">;
}) {
  return async function planRecipients(
    input: RecipientPlannerInput,
    now: number,
  ): Promise<RecipientPlan> {
    const recipients = await deps.repository.resolveAudience(input.audience);
    const inAppRecipients = input.channels.includes("in_app") ? recipients : [];
    const externalChannels = input.channels.filter(
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

    return { inAppRecipients, externalDeliveries };
  };
}

export type RecipientPlanner = ReturnType<typeof createRecipientPlanner>;
