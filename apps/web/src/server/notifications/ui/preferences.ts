import "server-only";
import {
  CATEGORY_META,
  EXTERNAL_CHANNELS,
  isChannelControllable,
  NOTIFICATION_CATEGORIES,
} from "~/server/notifications/categories";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import { composeNotifications } from "~/server/notifications/ui/composition";
import { executeSessionServerFunction } from "~/server/platform/action";
import { serverInfrastructure } from "~/server/platform/composition/infrastructure";
import { Ok } from "~/shared/result";

export interface NotificationChannelPreference {
  channel: (typeof EXTERNAL_CHANNELS)[number];
  controllable: boolean;
  available: boolean;
  enabled: boolean;
}

export interface NotificationChannelAvailability {
  channel: (typeof EXTERNAL_CHANNELS)[number];
  available: boolean;
}

export interface NotificationCategoryPreference {
  category: (typeof NOTIFICATION_CATEGORIES)[number];
  label: string;
  description: string;
  channels: NotificationChannelPreference[];
}

export interface NotificationPreferencesView {
  channels: NotificationChannelAvailability[];
  categories: NotificationCategoryPreference[];
}

// Default-on: a row in notification_opt_outs means "this user silenced this
// category on this channel"; absence means on.
export async function getNotificationPreferences(): Promise<NotificationPreferencesView> {
  return executeSessionServerFunction({
    name: "settings.notifications.read",
    access: { kind: "session" },

    execute: async (ctx) => {
      const addresses = createUserChannelAddressRepo(serverInfrastructure.db);

      const [optOuts, verifiedChannels] = await Promise.all([
        composeNotifications().preferences.listForUser(ctx.actor.userId),
        addresses.listVerifiedChannels(ctx.actor.userId),
      ]);
      const optedOut = new Set(
        optOuts.map((row) => `${row.category}:${row.channel}`),
      );
      const available = new Set(verifiedChannels);
      const channels = EXTERNAL_CHANNELS.map((channel) => ({
        channel,
        available: available.has(channel),
      }));

      const categories = NOTIFICATION_CATEGORIES.map((category) => ({
        category,
        label: CATEGORY_META[category].label,
        description: CATEGORY_META[category].description,
        channels: EXTERNAL_CHANNELS.map((channel) => {
          const controllable = isChannelControllable(category, channel);
          const isAvailable = available.has(channel);
          // Unavailable channels can't deliver (off). Mandatory channels are
          // non-controllable, so the UI shows them on but disabled. Otherwise
          // reflect the user's opt-out.
          const enabled = !isAvailable
            ? false
            : controllable
              ? !optedOut.has(`${category}:${channel}`)
              : true;
          return { channel, controllable, available: isAvailable, enabled };
        }),
      }));

      return Ok({ channels, categories });
    },
  });
}
