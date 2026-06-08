"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Ok } from "~/server/shared/result";

export interface HeaderNotification {
  id: number;
  eventType: string;
  priority: "high" | "normal" | "low";
  title: string;
  bodyText: string;
  actionUrl: string | null;
  createdAt: number;
  readAt: number | null;
}

export interface HeaderNotificationFeed {
  unreadCount: number;
  notifications: HeaderNotification[];
}

export async function getHeaderNotifications(): Promise<HeaderNotificationFeed> {
  return runAction({
    actionName: "notifications.header.read",
    access: { kind: "auth" },
    execute: async (ctx) => {
      const appNotifications =
        getServerRuntime().notifications.appNotifications;
      const [unreadCount, notifications] = await Promise.all([
        appNotifications.countUnreadByUser(ctx.actor.userId),
        appNotifications.listByUser(ctx.actor.userId, 20),
      ]);

      return Ok({
        unreadCount,
        notifications: notifications.map((it) => ({
          id: it.id,
          eventType: it.event_type,
          priority: it.priority,
          title: it.title,
          bodyText: it.body_text,
          actionUrl: it.action_url,
          createdAt: it.created_at,
          readAt: it.read_at,
        })),
      });
    },
  });
}

export async function markNotificationRead(
  notificationId: unknown,
): Promise<void> {
  await runAction({
    actionName: "notifications.mark_read",
    access: { kind: "auth" },
    parse: () =>
      parseObject({ notificationId }, validationFail, (r) => ({
        notificationId: r.posInt("notificationId"),
      })),
    audit: ({ notificationId }) => ({ notificationId }),
    execute: async (ctx, { notificationId }) => {
      await getServerRuntime().notifications.appNotifications.markRead(
        ctx.actor.userId,
        notificationId,
        Date.now(),
      );
      return Ok(undefined);
    },
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await runAction({
    actionName: "notifications.mark_all_read",
    access: { kind: "auth" },
    execute: async (ctx) => {
      await getServerRuntime().notifications.appNotifications.markAllRead(
        ctx.actor.userId,
        Date.now(),
      );
      return Ok(undefined);
    },
  });
}
