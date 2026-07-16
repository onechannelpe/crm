import type { RouteDefinition } from "@solidjs/router";

import { DashboardsIndex } from "~/features/dashboards/dashboards-index";
import { merchantFilterOptionsQuery } from "~/lib/queries/dashboards";

export const route = {
  preload: () => void merchantFilterOptionsQuery(),
} satisfies RouteDefinition;

export default function DashboardsIndexRoute() {
  return <DashboardsIndex />;
}
