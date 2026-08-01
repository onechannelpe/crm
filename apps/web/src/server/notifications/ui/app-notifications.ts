import "server-only";
import { executeSessionServerFunction } from "~/server/platform/action";
import { application } from "~/server/platform/composition/application";
import { Ok } from "~/shared/result";

export async function getHeaderNotifications() {
  return executeSessionServerFunction({
    name: "notifications.header.read",
    access: { kind: "auth" },

    execute: async ({ actor }) => {
      const { unreadCount, notifications } =
        await application.notifications.getHeader(actor.userId, 20);

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
