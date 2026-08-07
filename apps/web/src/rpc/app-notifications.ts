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

    telemetry: ({ notificationId }) => ({ notificationId }),

    execute: async ({ actor }, { notificationId }) => {
      await application.notifications.markRead(actor.userId, notificationId, {
        actor,
      });

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
      await application.notifications.markAllRead(actor.userId, { actor });

      return Ok(undefined);
    },
  });
}
