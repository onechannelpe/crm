import { action, json } from "@solidjs/router";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "~/actions/app-notifications";
import { headerNotificationsQuery } from "~/lib/queries/notifications";

export const markNotificationReadMutation = action(
  async (notificationId: number) => {
    await markNotificationRead(notificationId);
    return json({}, { revalidate: headerNotificationsQuery.key });
  },
  "markNotificationRead",
);

export const markAllNotificationsReadMutation = action(async () => {
  await markAllNotificationsRead();
  return json({}, { revalidate: headerNotificationsQuery.key });
}, "markAllNotificationsRead");
