import { query } from "@solidjs/router";

import { getNotificationPreferences } from "~/server/notifications/ui/preferences";

export const notificationPreferencesQuery = query(async () => {
  "use server";
  return getNotificationPreferences();
}, "notifications.preferences");
