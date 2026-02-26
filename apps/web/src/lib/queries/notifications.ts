import { query } from "@solidjs/router";

import { getHeaderNotifications } from "~/actions/app-notifications";

export const headerNotificationsQuery = query(
  getHeaderNotifications,
  "headerNotifications",
);
