import type { RouteDefinition } from "@solidjs/router";

import { DashboardsIndex } from "~/features/dashboards/dashboards-index";
import { merchantFilterOptionsQuery } from "~/lib/queries/dashboards";

// Warm the options so opening the single canonical dashboard from the index can
// resolve its month and stream data immediately.
export const route = {
  preload: () => void merchantFilterOptionsQuery(),
} satisfies RouteDefinition;

export default function DashboardsIndexRoute() {
  return <DashboardsIndex />;
}
