type Composition =
  typeof import("~/server/notifications/ui/app-notifications");

export async function getHeaderNotifications(
  ...args: Parameters<Composition["getHeaderNotifications"]>
) {
  "use server";
  const { getHeaderNotifications: execute } =
    await import("~/server/notifications/ui/app-notifications");
  return execute(...args);
}

export async function markNotificationRead(
  ...args: Parameters<Composition["markNotificationRead"]>
) {
  "use server";
  const { markNotificationRead: execute } =
    await import("~/server/notifications/ui/app-notifications");
  return execute(...args);
}

export async function markAllNotificationsRead(
  ...args: Parameters<Composition["markAllNotificationsRead"]>
) {
  "use server";
  const { markAllNotificationsRead: execute } =
    await import("~/server/notifications/ui/app-notifications");
  return execute(...args);
}
