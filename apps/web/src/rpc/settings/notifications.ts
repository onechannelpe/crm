import { invalid } from "~/domain/errors";
import {
  EXTERNAL_CHANNELS,
  isChannelControllable,
  NOTIFICATION_CATEGORIES,
} from "~/server/notifications/categories";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import { composeNotifications } from "~/server/notifications/ui/composition";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { serverInfrastructure } from "~/server/platform/composition/infrastructure";
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
    execute: async ({ actor }, command) => {
      if (!isChannelControllable(command.category, command.channel)) {
        return Err(invalid({ code: "channel_not_controllable" }));
      }

      const addresses = createUserChannelAddressRepo(serverInfrastructure.db);
      const verified = await addresses.listVerifiedChannels(actor.userId);
      if (!verified.includes(command.channel)) {
        return Err(invalid({ code: "channel_unavailable" }));
      }

      await composeNotifications().preferences.setOptedOut({
        userId: actor.userId,
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
