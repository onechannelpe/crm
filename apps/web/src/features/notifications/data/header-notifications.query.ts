import { query } from "@solidjs/router";

type GetHeaderNotifications =
  (typeof import("~/actions/app-notifications.action"))["getHeaderNotifications"];

export const headerNotificationsQuery = query(
  async (...args: Parameters<GetHeaderNotifications>) => {
    "use server";

    const { getHeaderNotifications } =
      await import("~/actions/app-notifications.action");
    return getHeaderNotifications(...args);
  },
  "notifications.header",
);
