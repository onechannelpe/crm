import { type RouteDefinition, useParams } from "@solidjs/router";
import { Show } from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state/empty";
import { AppPage, AppPageSection } from "~/components/layout/page";
import { MerchantGpvDashboard } from "~/features/dashboards/merchant-gpv-dashboard";
import { findDashboard } from "~/features/dashboards/registry";
import { merchantFilterOptionsQuery } from "~/lib/queries/dashboards";

// Attainment needs a month, and the month comes from the options list, so the
// options are the only thing worth warming ahead of the component.
export const route = {
  preload: () => void merchantFilterOptionsQuery(),
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
