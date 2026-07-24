import { query } from "@solidjs/router";

import { getHeaderNotifications } from "~/actions/app-notifications";
import { getNotificationPreferences } from "~/actions/settings/notifications";

export const headerNotificationsQuery = query(
  getHeaderNotifications,
  "headerNotifications",
);

export const notificationPreferencesQuery = query(
  getNotificationPreferences,
  "notificationPreferences",
);
