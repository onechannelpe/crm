import type { Kysely } from "kysely";

import type { UserId } from "~/domain/ids";
import type { Database } from "~/server/platform/database/types";
import type { Logger } from "~/shared/observability/logger";
import { Err, Ok, type Result } from "~/shared/result";

import {
  isChannelControllable,
  resolveCategory,
  type NotificationCategory,
} from "../categories";
import {
  parseNotificationAudience,
  parseNotificationChannels,
} from "../intent/payload";
import { createNotificationOptOutRepo } from "../repos/opt-out-repo";
import { createRecipientRepository } from "../repos/recipient-repo";
import type { NotificationAudience, NotificationChannel } from "../types";

export type PlannedExternalDelivery = {
  userId: UserId;
  channel: "email" | "whatsapp";
  recipientAddress: string;
};

export type RecipientPlan = {
  inAppRecipients: UserId[];
  externalDeliveries: PlannedExternalDelivery[];
};

export type RecipientPlannerInput = {
  audience: NotificationAudience;
  channels: NotificationChannel[];
  category: NotificationCategory;
};

export function projectIntentForPlanning(job: {
  event_type: string;
  audience_json: unknown;
  channels_json: unknown;
}): Result<RecipientPlannerInput, string> {
  try {
    const audience = parseNotificationAudience(job.audience_json);
    const channels = parseNotificationChannels(job.channels_json);
    const category = resolveCategory(job.event_type);
    if (category === null) {
      return Err(`Unknown event type: ${job.event_type}`);
    }

    return Ok({
      audience,
      channels,
      category,
    });
  } catch (error) {
    return Err(String(error));
  }
}

export function createRecipientPlanner(
  db: Kysely<Database>,
  logger: Pick<Logger, "info">,
) {
  const repository = createRecipientRepository(db);
  const optOuts = createNotificationOptOutRepo(db);

  return async function planRecipients(
    input: RecipientPlannerInput,
    plannedAt: Date,
  ): Promise<RecipientPlan> {
    const recipients = await repository.resolveAudience(input.audience);
    const inAppRecipients = input.channels.includes("in_app") ? recipients : [];
    const externalChannels = input.channels.filter(
      (channel): channel is "email" | "whatsapp" => channel !== "in_app",
    );

    // Opt-outs only matter for channels the user can actually silence for this
    // category; a mandatory category (e.g. security) skips the lookup entirely.
    const hasControllableChannel = externalChannels.some((channel) =>
      isChannelControllable(input.category, channel),
    );
    const optedOut = hasControllableChannel
      ? await optOuts.findOptOuts(recipients, input.category)
      : new Set<string>();

    const [addressMaps, activeWhatsAppUsers] = await Promise.all([
      Promise.all(
        externalChannels.map(async (channel) => ({
          channel,
          addresses: await repository.findVerifiedAddresses(
            recipients,
            channel,
          ),
        })),
      ),
      externalChannels.includes("whatsapp")
        ? repository.findActiveWhatsAppUsers(recipients, plannedAt)
        : Promise.resolve(new Set<UserId>()),
    ]);

    const externalDeliveries: PlannedExternalDelivery[] = [];
    for (const { channel, addresses } of addressMaps) {
      for (const userId of recipients) {
        if (
          isChannelControllable(input.category, channel) &&
          optedOut.has(`${userId}:${channel}`)
        ) {
          continue;
        }

        if (channel === "whatsapp" && !activeWhatsAppUsers.has(userId)) {
          logger.info("whatsapp_skipped_no_session", {
            userId,
            reason: "no_active_session",
          });
          continue;
        }

        const recipientAddress = addresses.get(userId);
        if (!recipientAddress) {
          if (channel === "whatsapp") {
            logger.info("whatsapp_skipped_no_address", {
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
