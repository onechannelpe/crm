import { AppNotificationId } from "~/domain/ids";
import { application } from "~/server/composition/application";
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
    telemetry: (command) => ({ notificationId: command.notificationId }),
    execute: async (ctx, command) => {
      await application.notifications.markRead(
        ctx.actor.userId,
        command.notificationId,
        ctx,
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
    execute: async (ctx) => {
      await application.notifications.markAllRead(ctx.actor.userId, ctx);
      return Ok(undefined);
    },
  });
}
