import { invalid } from "~/domain/errors";
import { application } from "~/server/composition/application";
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
  category: unknown,
  channel: unknown,
  enabled: unknown,
) {
  "use server";

  return executeSessionServerFunction({
    name: "settings.notifications.update",
    access: { kind: "session" },
    parse: () =>
      parseObject({ category, channel, enabled }, validationFail, (reader) => ({
        category: reader.enum("category", NOTIFICATION_CATEGORIES),
        channel: reader.enum("channel", EXTERNAL_CHANNELS),
        enabled: reader.bool("enabled"),
      })),
    audit: (command) => ({
      category: command.category,
      channel: command.channel,
      enabled: command.enabled,
    }),
    execute: async (ctx, command) => {
      if (!isChannelControllable(command.category, command.channel)) {
        return Err(invalid({ code: "channel_not_controllable" }));
      }

      const { verifiedChannels: verified } =
        await application.notifications.listPreferences(ctx.actor.userId);
      if (!verified.includes(command.channel)) {
        return Err(invalid({ code: "channel_unavailable" }));
      }

      await application.notifications.setPreference({
        userId: ctx.actor.userId,
        category: command.category,
        channel: command.channel,
        optedOut: !command.enabled,
        operation: ctx,
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
