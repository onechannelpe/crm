import { action, json } from "@solidjs/router";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "~/rpc/app-notifications.action";
import { headerNotificationsQuery } from "~/rpc/notifications/header-notifications.query";
import { notificationPreferencesQuery } from "~/rpc/notifications/notification-preferences.query";
import { setNotificationPreference } from "~/rpc/settings/notifications.action";

export const markNotificationReadMutation = action(
  async (notificationId: string) => {
    await markNotificationRead(notificationId);
    return json({}, { revalidate: headerNotificationsQuery.key });
  },
  "markNotificationRead",
);

export const markAllNotificationsReadMutation = action(async () => {
  await markAllNotificationsRead();
  return json({}, { revalidate: headerNotificationsQuery.key });
}, "markAllNotificationsRead");

export const setNotificationPreferenceMutation = action(
  async (category: string, channel: string, enabled: boolean) => {
    const result = await setNotificationPreference(category, channel, enabled);
    return json(result, { revalidate: notificationPreferencesQuery.key });
  },
  "setNotificationPreference",
);
