import { createAsync } from "@solidjs/router";
import { createMemo, Show, Suspense, type Accessor } from "solid-js";

import { ScrollWrapper } from "~/components/ui/utilities/scroll-wrapper";
import type { BookFilter } from "~/contracts/merchant-stats/views";
import { WidgetGrid, WidgetGridItem } from "~/features/widgets/widget-layout";
import { WidgetSkeleton } from "~/features/widgets/widget-skeleton";
import {
  culqiUserGpvQuery,
  merchantFilterOptionsQuery,
} from "~/lib/queries/dashboards";

import { AsyncTiles } from "../async-tiles";
import { formatMonth, formatSolesCompact } from "../format";
import { GpvFilterBar } from "../gpv-filter-bar";
import type { GpvView } from "../gpv-view";
import { BarTile } from "../tiles";

import styles from "./culqi-view.module.css";

export function CulqiView(props: { view: GpvView }) {
  return (
    <Suspense
      fallback={
        <div class={styles.scrollArea}>
          <ScrollWrapper>
            <WidgetGrid>
              <WidgetGridItem span="full">
                <WidgetSkeleton />
              </WidgetGridItem>
            </WidgetGrid>
          </ScrollWrapper>
        </div>
      }
    >
      <CulqiContent view={props.view} />
    </Suspense>
  );
}

function CulqiContent(props: { view: GpvView }) {
  const options = createAsync(() => merchantFilterOptionsQuery());
  const month = createMemo(
    () => props.view.filter().month ?? options()?.months[0] ?? null,
  );

  return (
    <>
      <GpvFilterBar view={props.view} />
      <div class={styles.scrollArea}>
        <ScrollWrapper>
          <WidgetGrid>
            <WidgetGridItem span="full">
              <p class={styles.note}>
                El <strong>usuario de Culqi</strong> solo se usa para comparar
                con el reporte de Culqi. La atribución real está en la pestaña
                Rendimiento.
              </p>
            </WidgetGridItem>

            <Show when={month()}>
              {(activeMonth) => (
                <AsyncTiles spans={["full"]}>
                  <CulqiBar filter={props.view.filter} month={activeMonth} />
                </AsyncTiles>
              )}
            </Show>
          </WidgetGrid>
        </ScrollWrapper>
      </div>
    </>
  );
}

function CulqiBar(props: {
  filter: Accessor<BookFilter>;
  month: Accessor<string>;
}) {
  const rows = createAsync(() =>
    culqiUserGpvQuery({ filter: props.filter(), month: props.month() }),
  );

  return (
    <Show when={rows()}>
      {(data) => {
        const total = () => data().reduce((sum, row) => sum + row.gpv, 0);

        return (
          <BarTile
            title={`GPV ${formatMonth(props.month())} por usuario de Culqi · ${formatSolesCompact(
              total(),
            )}`}
            span="full"
            rows={data().map((row) => ({
              key: row.culqiUserName ?? "sin-usuario",
              label: row.culqiUserName ?? "Sin usuario",
              sublabel: `${row.deviceCount} dispositivos`,
              value: row.gpv,
              target: null,
            }))}
          />
        );
      }}
    </Show>
  );
}
