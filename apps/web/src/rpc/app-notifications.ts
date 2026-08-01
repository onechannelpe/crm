import { AppNotificationId } from "~/domain/ids";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { application } from "~/server/platform/composition/application";
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
    execute: async ({ actor, operationAt: now }, command) => {
      await application.notifications.markRead(
        actor.userId,
        command.notificationId,
        now,
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
    execute: async ({ actor, operationAt: now }) => {
      await application.notifications.markAllRead(actor.userId, now);
      return Ok(undefined);
    },
  });
}
