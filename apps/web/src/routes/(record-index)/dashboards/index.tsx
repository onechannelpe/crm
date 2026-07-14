import type { RouteDefinition } from "@solidjs/router";

import { DashboardsIndex } from "~/features/dashboards/dashboards-index";
import { merchantStatsOverviewQuery } from "~/lib/queries/dashboards";

// Warm the single canonical dashboard so opening it from the index streams data.
export const route = {
  preload: () => merchantStatsOverviewQuery({}),
} satisfies RouteDefinition;

export default function DashboardsIndexRoute() {
  return <DashboardsIndex />;
}
