import "server-only";
import type { NotificationPreferencesView } from "~/contracts/notifications";
import {
  CATEGORY_META,
  EXTERNAL_CHANNELS,
  isChannelControllable,
  NOTIFICATION_CATEGORIES,
} from "~/server/notifications/categories";
import { executeSessionServerFunction } from "~/server/platform/action";
import { application } from "~/server/platform/composition/application";
import { Ok } from "~/shared/result";

// Default-on: a row in notification_opt_outs means "this user silenced this
// category on this channel"; absence means on.
export async function getNotificationPreferences(): Promise<NotificationPreferencesView> {
  return executeSessionServerFunction({
    name: "settings.notifications.read",
    access: { kind: "session" },

    execute: async (ctx) => {
      const { optOuts, verifiedChannels } =
        await application.notifications.listPreferences(ctx.actor.userId);
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
