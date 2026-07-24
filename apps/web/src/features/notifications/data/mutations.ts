import { action, json } from "@solidjs/router";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "~/actions/app-notifications";
import { setNotificationPreference } from "~/actions/settings/notifications";
import {
  headerNotificationsQuery,
  notificationPreferencesQuery,
} from "~/features/notifications/data/queries";

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
