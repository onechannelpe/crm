"use server";

import {
  CATEGORY_META,
  EXTERNAL_CHANNELS,
  isChannelControllable,
  NOTIFICATION_CATEGORIES,
} from "~/server/notifications/categories";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { invalid } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Err, Ok } from "~/server/shared/result";

export interface NotificationChannelPreference {
  channel: (typeof EXTERNAL_CHANNELS)[number];
  controllable: boolean;
  available: boolean;
  enabled: boolean;
}

export interface NotificationCategoryPreference {
  category: (typeof NOTIFICATION_CATEGORIES)[number];
  label: string;
  description: string;
  channels: NotificationChannelPreference[];
}

export interface NotificationPreferencesView {
  categories: NotificationCategoryPreference[];
}

// Default-on: a row means "this user silenced this category on this channel",
// absence means on. Locked (non-controllable) cells report enabled=true so
// the UI shows them on but disabled.
export async function getNotificationPreferences(): Promise<NotificationPreferencesView> {
  return runAction({
    name: "settings.notifications.read",
    access: { kind: "session" },

    execute: async (ctx) => {
      const runtime = getServerRuntime();
      const addresses = createUserChannelAddressRepo(runtime.infra.db);

      const [optOuts, verifiedChannels] = await Promise.all([
        runtime.notifications.preferences.listForUser(ctx.actor.userId),
        addresses.listVerifiedChannels(ctx.actor.userId),
      ]);
      const optedOut = new Set(
        optOuts.map((row) => `${row.category}:${row.channel}`),
      );
      const available = new Set(verifiedChannels);

      const categories = NOTIFICATION_CATEGORIES.map((category) => ({
        category,
        label: CATEGORY_META[category].label,
        description: CATEGORY_META[category].description,
        channels: EXTERNAL_CHANNELS.map((channel) => {
          const controllable = isChannelControllable(category, channel);
          const isAvailable = available.has(channel);
          // Unavailable channels can't deliver, so they read as off. Mandatory
          // channels are always on when available. Otherwise reflect the opt-out.
          const enabled = !isAvailable
            ? false
            : controllable
              ? !optedOut.has(`${category}:${channel}`)
              : true;
          return { channel, controllable, available: isAvailable, enabled };
        }),
      }));

      return Ok({ categories });
    },
  });
}

export async function setNotificationPreference(
  rawCategory: unknown,
  rawChannel: unknown,
  rawEnabled: unknown,
): Promise<NotificationChannelPreference & { category: string }> {
  return runAction({
    name: "settings.notifications.update",
    access: { kind: "session" },

    parse: () =>
      parseObject(
        { category: rawCategory, channel: rawChannel, enabled: rawEnabled },
        validationFail,
        (r) => ({
          category: r.enum("category", NOTIFICATION_CATEGORIES),
          channel: r.enum("channel", EXTERNAL_CHANNELS),
          enabled: r.bool("enabled"),
        }),
      ),

    audit: (command) => ({
      category: command.category,
      channel: command.channel,
      enabled: command.enabled,
    }),

    execute: async (ctx, command) => {
      // Mandatory categories (security) have no controllable channel and cannot
      // be silenced; reject rather than write a row the planner would ignore.
      if (!isChannelControllable(command.category, command.channel)) {
        return Err(invalid({ code: "channel_not_controllable" }));
      }

      const runtime = getServerRuntime();
      const addresses = createUserChannelAddressRepo(runtime.infra.db);
      const verified = await addresses.listVerifiedChannels(ctx.actor.userId);
      // A channel with no verified address cannot deliver, so there is nothing
      // to configure. The UI disables it; reject direct calls to match.
      if (!verified.includes(command.channel)) {
        return Err(invalid({ code: "channel_unavailable" }));
      }

      await runtime.notifications.preferences.setOptedOut({
        userId: ctx.actor.userId,
        category: command.category,
        channel: command.channel,
        optedOut: !command.enabled,
        now: new Date(),
      });

      return Ok({
        category: command.category,
        channel: command.channel,
        controllable: true,
        available: true,
        enabled: command.enabled,
      });
    },
  });
}
