import type { RouteDefinition } from "@solidjs/router";

import { DashboardsIndex } from "~/features/dashboards/dashboards-index";
import { ATTAINMENT_OFFSET } from "~/features/dashboards/merchant-gpv-dashboard";
import { merchantPerformanceQuery } from "~/lib/queries/dashboards";

// Warm the single canonical dashboard so opening it from the index streams data.
export const route = {
  preload: () => void merchantPerformanceQuery(ATTAINMENT_OFFSET),
} satisfies RouteDefinition;

export default function DashboardsIndexRoute() {
  return <DashboardsIndex />;
}
