import { query } from "@solidjs/router";

import { getHeaderNotifications } from "~/actions/app-notifications.action";
import { getNotificationPreferences } from "~/actions/settings/notifications.action";

export const headerNotificationsQuery = query(
  getHeaderNotifications,
  "headerNotifications",
);

export const notificationPreferencesQuery = query(
  getNotificationPreferences,
  "notificationPreferences",
);
