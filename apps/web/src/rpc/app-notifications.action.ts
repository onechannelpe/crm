import { AppNotificationId } from "~/domain/ids";
import { composeNotifications } from "~/server/notifications/ui/composition";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { Ok } from "~/shared/result";

export async function markNotificationRead(
  notificationId: unknown,
): Promise<void> {
  "use server";

  await executeSessionServerFunction({
    name: "notifications.mark_read",
    access: { kind: "auth" },
    parse: () =>
      parseObject({ notificationId }, validationFail, (reader) => ({
        notificationId: reader.id("notificationId", AppNotificationId),
      })),
    audit: (command) => ({ notificationId: command.notificationId }),
    execute: async ({ actor }, command) => {
      await composeNotifications().appNotifications.markRead(
        actor.userId,
        command.notificationId,
        new Date(),
      );
      return Ok(undefined);
    },
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  "use server";

  await executeSessionServerFunction({
    name: "notifications.mark_all_read",
    access: { kind: "auth" },
    execute: async ({ actor }) => {
      await composeNotifications().appNotifications.markAllRead(
        actor.userId,
        new Date(),
      );
      return Ok(undefined);
    },
  });
}
