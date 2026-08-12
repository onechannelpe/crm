import { createAsync } from "@solidjs/router";
import { ErrorBoundary, Show, Suspense } from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state/empty";
import { AppPageBody } from "~/components/layout/page";
import { MassMarketCaja1Section } from "~/features/merchant-stats/commission/commission-tab";
import { WidgetCanvas } from "~/features/widgets/widget-layout";
import { WidgetSkeleton } from "~/features/widgets/widget-skeleton";
import { commissionManagerDashboardQuery } from "~/rpc/merchant-stats/commission-scheme";

export function SalesManagerCaja1Snapshot() {
  const view = createAsync(() => commissionManagerDashboardQuery());

  return (
    <AppPageBody>
      <WidgetCanvas>
        <ErrorBoundary fallback={<SnapshotError />}>
          <Suspense fallback={<WidgetSkeleton />}>
            <Show when={view()}>
              {(readyView) => (
                <MassMarketCaja1Section
                  result={readyView().massMarketCaja1}
                  tileHref="/dashboards/merchant-gpv?tab=comisiones"
                />
              )}
            </Show>
          </Suspense>
        </ErrorBoundary>
      </WidgetCanvas>
    </AppPageBody>
  );
}

function SnapshotError() {
  return (
    <EmptyState
      title="No se pudo cargar el resumen de comisiones"
      description="Vuelve a intentarlo en unos segundos."
    />
  );
}
