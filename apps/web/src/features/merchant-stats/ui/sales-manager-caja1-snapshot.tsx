import { A, createAsync } from "@solidjs/router";
import { ErrorBoundary, Show, Suspense } from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state/empty";
import { Skeleton } from "~/components/ui/feedback/skeleton";
import { MassMarketCaja1Section } from "~/features/merchant-stats/commission/commission-tab";
import { commissionManagerDashboardQuery } from "~/rpc/merchant-stats/commission-scheme";

import styles from "./sales-manager-caja1-snapshot.module.css";

export function SalesManagerCaja1Snapshot() {
  const view = createAsync(() => commissionManagerDashboardQuery());

  return (
    <div class={styles.page}>
      <div class={styles.header}>
        <h1 class={styles.title}>Caja 1 · Mesa 2 y 3</h1>
        <A class={styles.link} href="/dashboards/merchant-gpv?tab=comisiones">
          Ver comisiones completo
        </A>
      </div>

      <ErrorBoundary fallback={<SnapshotError />}>
        <Suspense fallback={<Skeleton height={120} />}>
          <Show when={view()}>
            {(readyView) => (
              <MassMarketCaja1Section result={readyView().massMarketCaja1} />
            )}
          </Show>
        </Suspense>
      </ErrorBoundary>
    </div>
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
