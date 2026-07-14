import { type RouteDefinition, useParams } from "@solidjs/router";
import { Show } from "solid-js";

import { MerchantGpvDashboard } from "~/features/dashboards/merchant-gpv-dashboard";
import { findDashboard } from "~/features/dashboards/registry";
import { businessStatsOverviewQuery } from "~/lib/queries/dashboards";

export const route = {
  preload: () => businessStatsOverviewQuery({}),
} satisfies RouteDefinition;

export default function DashboardShowRoute() {
  const params = useParams<{ dashboardId: string }>();
  const dashboard = () => findDashboard(params.dashboardId);

  return (
    <Show when={dashboard()} fallback={<DashboardNotFound />}>
      <MerchantGpvDashboard />
    </Show>
  );
}

function DashboardNotFound() {
  return (
    <p class="px-1 py-6 text-sm text-muted-foreground">Este panel no existe.</p>
  );
}
