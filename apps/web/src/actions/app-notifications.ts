"use server";

import { requireAuth } from "~/lib/auth/access/session";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { createAppNotificationsRepo } from "~/server/notifications/repos-app-notifications";
import { serverRuntime } from "~/server/runtime";

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
  const appNotifications = createAppNotificationsRepo(serverRuntime.infra.db);
  const session = await requireAuth();
  const [unreadCount, notifications] = await Promise.all([
    appNotifications.countUnreadByUser(session.userId),
    appNotifications.listByUser(session.userId, 20),
  ]);

  return {
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
  };
}

export async function markNotificationRead(
  notificationId: number,
): Promise<void> {
  const appNotifications = createAppNotificationsRepo(serverRuntime.infra.db);
  const session = await requireAuth();
  await appNotifications.markRead(
    session.userId,
    assertPositiveInt(notificationId, "notificationId"),
    Date.now(),
  );
}

export async function markAllNotificationsRead(): Promise<void> {
  const appNotifications = createAppNotificationsRepo(serverRuntime.infra.db);
  const session = await requireAuth();
  await appNotifications.markAllRead(session.userId, Date.now());
}
