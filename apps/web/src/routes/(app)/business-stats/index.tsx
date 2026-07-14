import type { RouteDefinition } from "@solidjs/router";

import { BusinessStatsPage } from "~/features/business-stats/business-stats-page";
import { businessStatsOverviewQuery } from "~/lib/queries/business-stats";

export const route = {
  preload: () => businessStatsOverviewQuery({}),
} satisfies RouteDefinition;

export default function BusinessStatsRoute() {
  return <BusinessStatsPage />;
}
