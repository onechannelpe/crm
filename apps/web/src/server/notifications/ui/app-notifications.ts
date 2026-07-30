import "server-only";
import { composeNotifications } from "~/server/notifications/ui/composition";
import { executeSessionServerFunction } from "~/server/platform/action";
import { Ok } from "~/shared/result";

export async function getHeaderNotifications() {
  return executeSessionServerFunction({
    name: "notifications.header.read",
    access: { kind: "auth" },

    execute: async ({ actor }) => {
      const appNotifications = composeNotifications().appNotifications;

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
          createdAt: notification.created_at.getTime(),
          readAt: notification.read_at?.getTime() ?? null,
        })),
      });
    },
  });
}
