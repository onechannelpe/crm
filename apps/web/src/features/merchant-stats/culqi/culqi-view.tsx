import { createAsync } from "@solidjs/router";
import {
  createMemo,
  createSignal,
  ErrorBoundary,
  Show,
  Suspense,
} from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state/empty";
import { SearchInput } from "~/components/ui/input/search-input";
import { WidgetCardShell } from "~/features/widgets/widget-card-shell";
import {
  WidgetCanvas,
  WidgetGrid,
  WidgetGridItem,
} from "~/features/widgets/widget-layout";
import { WidgetSkeleton } from "~/features/widgets/widget-skeleton";
import { gpvCulqiViewQuery } from "~/rpc/merchant-stats/gpv-culqi-view";

import { BarList } from "../charts/bar-list";
import { formatMonth, formatSolesCompact } from "../format";
import type { GpvView } from "../gpv-view";

import styles from "./culqi-view.module.css";

export function CulqiView(props: { view: GpvView }) {
  const culqi = createAsync(() =>
    gpvCulqiViewQuery({ filter: props.view.filter() }),
  );
  const ready = () => {
    const view = culqi();
    return view?.kind === "ready" ? view : null;
  };
  const [search, setSearch] = createSignal("");

  // Culqi's own usuario identity, unrelated to whether a CRM user account
  // exists for that person -- filtering here must never depend on a CRM
  // match, since most usuarios won't have one.
  const filteredRows = createMemo(() => {
    const rows = ready()?.rows ?? [];
    const query = search().trim().toLowerCase();
    if (!query) {
      return rows;
    }
    return rows.filter((row) =>
      (row.culqiUserName ?? "sin usuario").toLowerCase().includes(query),
    );
  });

  const total = () => filteredRows().reduce((sum, row) => sum + row.gpv, 0);

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
            <WidgetCanvas>
              <WidgetGrid>
                <WidgetGridItem span="full">
                  <WidgetCardShell
                    title={`GPV ${formatMonth(view().month)} por usuario de Culqi · ${formatSolesCompact(total())}`}
                    count={filteredRows().length}
                    status={filteredRows().length ? "ready" : "empty"}
                    emptyLabel="Ningún usuario coincide con la búsqueda."
                  >
                    <div class={styles.body}>
                      <p class={styles.note}>
                        El <strong>usuario de Culqi</strong> solo se usa para
                        comparar con el reporte de Culqi. La atribución real
                        está en la pestaña Rendimiento.
                      </p>

                      <SearchInput
                        value={search()}
                        onValueChange={setSearch}
                        placeholder="Buscar usuario de Culqi..."
                        aria-label="Buscar usuario de Culqi"
                      />

                      <BarList
                        rows={filteredRows().map((row) => ({
                          key: row.culqiUserName ?? "sin-usuario",
                          label: row.culqiUserName ?? "Sin usuario",
                          sublabel: `${row.deviceCount} dispositivos`,
                          value: row.gpv,
                          target: null,
                        }))}
                      />
                    </div>
                  </WidgetCardShell>
                </WidgetGridItem>
              </WidgetGrid>
            </WidgetCanvas>
          )}
        </Show>
      </Suspense>
    </ErrorBoundary>
  );
}

function CulqiSkeleton() {
  return (
    <WidgetCanvas>
      <WidgetGrid>
        <WidgetGridItem span="full">
          <WidgetSkeleton />
        </WidgetGridItem>
      </WidgetGrid>
    </WidgetCanvas>
  );
}

function CulqiError() {
  return (
    <WidgetCanvas>
      <WidgetGrid>
        <WidgetGridItem span="full">
          <WidgetCardShell title="Vista Culqi" status="error">
            <span />
          </WidgetCardShell>
        </WidgetGridItem>
      </WidgetGrid>
    </WidgetCanvas>
  );
}
