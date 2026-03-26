"use server";

import { requireAuth } from "~/lib/auth/access/session";
import { assertPositiveInt } from "~/lib/contracts/guards";
import { createDiagnostics } from "~/lib/observability/diagnostics";
import { repos } from "~/server/shared/context";

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

const diagnostics = createDiagnostics("header-notifications-action");

export async function getHeaderNotifications(): Promise<HeaderNotificationFeed> {
  return diagnostics.traceAsync(
    "ssr",
    "load_header_notifications",
    async () => {
      const session = await requireAuth();
      const [unreadCount, notifications] = await Promise.all([
        repos.appNotifications.countUnreadByUser(session.userId),
        repos.appNotifications.listByUser(session.userId, 20),
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
    },
  );
}

export async function markNotificationRead(
  notificationId: number,
): Promise<void> {
  const session = await requireAuth();
  await repos.appNotifications.markRead(
    session.userId,
    assertPositiveInt(notificationId, "notificationId"),
    Date.now(),
  );
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await requireAuth();
  await repos.appNotifications.markAllRead(session.userId, Date.now());
}
