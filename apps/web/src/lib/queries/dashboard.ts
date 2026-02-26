import { query } from "@solidjs/router";

import { getDashboardStats } from "~/actions/dashboard";

export const dashboardStatsQuery = query(getDashboardStats, "dashboardStats");
