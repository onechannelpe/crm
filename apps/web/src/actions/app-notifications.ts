"use server";

import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Ok } from "~/server/shared/result";

export async function getHeaderNotifications() {
  return runAction({
    name: "notifications.header.read",
    access: { kind: "auth" },

    execute: async ({ actor }) => {
      const appNotifications =
        getServerRuntime().notifications.appNotifications;

      const [unreadCount, notifications] = await Promise.all([
        appNotifications.countUnreadByUser(actor.userId),
        appNotifications.listByUser(actor.userId, 20),
      ]);

      return Ok({
        unreadCount,
        notifications: notifications.map((notification) => ({
          id: notification.id,
          eventType: notification.event_type,
          priority: notification.priority,
          title: notification.title,
          bodyText: notification.body_text,
          actionUrl: notification.action_url,
          createdAt: notification.created_at,
          readAt: notification.read_at,
        })),
      });
    },
  });
}

export async function markNotificationRead(
  rawNotificationId: unknown,
): Promise<void> {
  await runAction({
    name: "notifications.mark_read",
    access: { kind: "auth" },

    parse: () =>
      parseObject(
        { notificationId: rawNotificationId },
        validationFail,
        (r) => ({
          notificationId: r.posInt("notificationId"),
        }),
      ),

    audit: (command) => ({ notificationId: command.notificationId }),

    execute: async ({ actor }, command) => {
      const appNotifications =
        getServerRuntime().notifications.appNotifications;

      await appNotifications.markRead(
        actor.userId,
        command.notificationId,
        Date.now(),
      );

      return Ok(undefined);
    },
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await runAction({
    name: "notifications.mark_all_read",
    access: { kind: "auth" },

    execute: async ({ actor }) => {
      const appNotifications =
        getServerRuntime().notifications.appNotifications;

      await appNotifications.markAllRead(actor.userId, Date.now());

      return Ok(undefined);
    },
  });
}
