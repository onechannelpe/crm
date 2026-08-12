import { query } from "@solidjs/router";

import { getHeaderNotifications } from "~/server/notifications/ui/app-notifications";

export const headerNotificationsQuery = query(async () => {
  "use server";
  return getHeaderNotifications();
}, "notifications.header");
