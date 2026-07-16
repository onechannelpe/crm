import { type RouteDefinition, useParams } from "@solidjs/router";
import { Show } from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state/empty";
import { AppPage, AppPageSection } from "~/components/layout/page";
import { readGpvFilter } from "~/features/dashboards/gpv-view";
import { GPV_GRID_PAGE_SIZE } from "~/features/dashboards/grids/use-dashboard-grid";
import { MerchantGpvDashboard } from "~/features/dashboards/merchant-gpv-dashboard";
import { findDashboard } from "~/features/dashboards/registry";
import {
  cohortRowsQuery,
  lifecycleQuery,
  merchantFilterOptionsQuery,
  qualitySummaryQuery,
  rampQuery,
} from "~/lib/queries/dashboards";

export const route = {
  // Reads that need a default month load after filter options resolve.
  preload: ({ location }) => {
    const filter = readGpvFilter(location.query);
    void merchantFilterOptionsQuery();
    void rampQuery({ filter });
    void lifecycleQuery({ filter });
    void qualitySummaryQuery();
    void cohortRowsQuery({
      filter,
      page: { limit: GPV_GRID_PAGE_SIZE, offset: 0 },
    });
  },
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
    <AppPage>
      <AppPageSection>
        <EmptyState
          title="Este panel no existe"
          description="Revisa el enlace o vuelve a la lista de paneles."
        />
      </AppPageSection>
    </AppPage>
  );
}
