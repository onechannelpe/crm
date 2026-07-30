import { query } from "@solidjs/router";

type GetNotificationPreferences =
  (typeof import("~/actions/settings/notifications.action"))["getNotificationPreferences"];

export const notificationPreferencesQuery = query(
  async (...args: Parameters<GetNotificationPreferences>) => {
    "use server";

    const { getNotificationPreferences } =
      await import("~/actions/settings/notifications.action");
    return getNotificationPreferences(...args);
  },
  "notifications.preferences",
);
