import { createAsync } from "@solidjs/router";
import { createMemo, createSignal } from "solid-js";

import { ScrollWrapper } from "~/components/ui/utilities/scroll-wrapper";
import type {
  BookFilter,
  FilterOptions,
} from "~/contracts/merchant-stats/views";
import { WidgetGrid, WidgetGridItem } from "~/features/widgets/widget-layout";
import { culqiUserGpvQuery } from "~/lib/queries/dashboards";

import { formatMonth, formatSolesCompact } from "../format";
import { RecordFilterBar } from "../grids/record-filter-bar";
import { BarTile } from "../tiles";

import styles from "./culqi-view.module.css";

interface CulqiViewProps {
  options: FilterOptions;
}

// Culqi's own answer to "who sold this", straight off the `vendedor` column.
//
// This is a reconciliation surface and it is labelled as one on purpose. The
// usuario is who the sale was registered under at Culqi, and it is not the
// seller: matched against the team's hand-kept real-seller column across 1,324
// rows it agreed 0% of the time, and the same usuario maps to different real
// people. It exists to square our book against Culqi's, never to rank anyone.
export function CulqiView(props: CulqiViewProps) {
  const [filter, setFilter] = createSignal<BookFilter>({});

  const month = createMemo(
    () => filter().month ?? props.options.months[0] ?? null,
  );

  const rows = createAsync(
    () => {
      const current = month();
      return current
        ? culqiUserGpvQuery({ filter: filter(), month: current })
        : Promise.resolve([]);
    },
    { initialValue: [] },
  );

  const monthLabel = createMemo(() => {
    const current = month();
    return current ? formatMonth(current) : "—";
  });

  const total = createMemo(() => rows().reduce((sum, row) => sum + row.gpv, 0));

  return (
    <>
      <RecordFilterBar
        options={props.options}
        filter={filter()}
        onChange={(patch) => setFilter((current) => ({ ...current, ...patch }))}
      />
      <div class={styles.scrollArea}>
        <ScrollWrapper>
          <WidgetGrid>
            <WidgetGridItem span="full">
              <p class={styles.note}>
                El <strong>usuario de Culqi</strong> es quien registró la venta
                en su sistema, no el vendedor real. Sirve para cuadrar contra el
                reporte de Culqi; la atribución del CRM vive en la pestaña
                Rendimiento.
              </p>
            </WidgetGridItem>

            <BarTile
              title={`GPV ${monthLabel()} por usuario de Culqi · ${formatSolesCompact(total())}`}
              span="full"
              rows={rows().map((row) => ({
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
    </>
  );
}
