import { invalid } from "~/domain/errors";
import { getApplication } from "~/server/composition/application";
import {
  EXTERNAL_CHANNELS,
  isChannelControllable,
  NOTIFICATION_CATEGORIES,
} from "~/server/notifications/categories";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { Err, Ok } from "~/shared/result";

export async function setNotificationPreference(
  rawCategory: unknown,
  rawChannel: unknown,
  rawEnabled: unknown,
) {
  "use server";

  return executeSessionServerFunction({
    name: "settings.notifications.update",
    access: { kind: "session" },

    parse: () =>
      parseObject(
        { category: rawCategory, channel: rawChannel, enabled: rawEnabled },
        validationFail,
        (reader) => ({
          category: reader.enum("category", NOTIFICATION_CATEGORIES),
          channel: reader.enum("channel", EXTERNAL_CHANNELS),
          enabled: reader.bool("enabled"),
        }),
      ),

    telemetry: ({ category, channel, enabled }) => ({
      category,
      channel,
      enabled,
    }),

    execute: async (ctx, command) => {
      const { category, channel, enabled } = command;

      if (!isChannelControllable(category, channel)) {
        return Err(invalid({ code: "channel_not_controllable" }));
      }

      const { verifiedChannels } =
        await getApplication().notifications.listPreferences(ctx.actor.userId);

      if (!verifiedChannels.includes(channel)) {
        return Err(invalid({ code: "channel_unavailable" }));
      }

      await getApplication().notifications.setPreference({
        userId: ctx.actor.userId,
        category,
        channel,
        optedOut: !enabled,
        operation: ctx,
      });

      return Ok({
        category,
        channel,
        controllable: true,
        available: true,
        enabled,
      });
    },
  });
}
