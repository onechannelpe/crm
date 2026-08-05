import { createAsync } from "@solidjs/router";
import { ErrorBoundary, Show, Suspense } from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state/empty";
import { ScrollWrapper } from "~/components/ui/utilities/scroll-wrapper";
import { WidgetCardShell } from "~/features/widgets/widget-card-shell";
import { WidgetGrid, WidgetGridItem } from "~/features/widgets/widget-layout";
import { WidgetSkeleton } from "~/features/widgets/widget-skeleton";
import { gpvCulqiViewQuery } from "~/rpc/merchant-stats/gpv-culqi-view";

import { formatMonth, formatSolesCompact } from "../format";
import type { GpvView } from "../gpv-view";
import { BarTile } from "../tiles";

import styles from "./culqi-view.module.css";

export function CulqiView(props: { view: GpvView }) {
  const culqi = createAsync(() =>
    gpvCulqiViewQuery({ filter: props.view.filter() }),
  );
  const ready = () => {
    const view = culqi();
    return view?.kind === "ready" ? view : null;
  };

  return (
    <ErrorBoundary fallback={<CulqiError />}>
      <Suspense fallback={<CulqiSkeleton />}>
        <Show
          when={ready()}
          fallback={
            <EmptyState
              title="Sin datos de GPV"
              description="Importa un reporte para comparar la vista de Culqi."
            />
          }
        >
          {(view) => (
            <div class={styles.scrollArea}>
              <ScrollWrapper>
                <WidgetGrid>
                  <WidgetGridItem span="full">
                    <p class={styles.note}>
                      El <strong>usuario de Culqi</strong> solo se usa para
                      comparar con el reporte de Culqi. La atribución real está
                      en la pestaña Rendimiento.
                    </p>
                  </WidgetGridItem>
                  <BarTile
                    title={`GPV ${formatMonth(
                      view().month,
                    )} por usuario de Culqi · ${formatSolesCompact(
                      view().rows.reduce((sum, row) => sum + row.gpv, 0),
                    )}`}
                    span="full"
                    rows={view().rows.map((row) => ({
                      key: row.culqiUserName ?? "sin-usuario",
                      label: row.culqiUserName ?? "Sin usuario",
                      sublabel: `${row.deviceCount} dispositivos`,
                      value: row.gpv,
                      target: null,
                    }))}
                  />
                </WidgetGrid>
              </ScrollWrapper>
            </div>
          )}
        </Show>
      </Suspense>
    </ErrorBoundary>
  );
}

function CulqiSkeleton() {
  return (
    <div class={styles.scrollArea}>
      <ScrollWrapper>
        <WidgetGrid>
          <WidgetGridItem span="full">
            <WidgetSkeleton />
          </WidgetGridItem>
        </WidgetGrid>
      </ScrollWrapper>
    </div>
  );
}

function CulqiError() {
  return (
    <div class={styles.scrollArea}>
      <WidgetCardShell title="Vista Culqi" status="error">
        <span />
      </WidgetCardShell>
    </div>
  );
}
