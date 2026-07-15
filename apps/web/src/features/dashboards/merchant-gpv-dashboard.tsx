import { createAsync, revalidate } from "@solidjs/router";
import { createMemo, createSignal, Match, Show, Switch } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { ScrollWrapper } from "~/components/ui/utilities/scroll-wrapper";
import type { BookFilter } from "~/contracts/merchant-stats/views";
import {
  TabStrip,
  type TabItem,
} from "~/features/side-panel/components/tab-strip";
import { WidgetCardShell } from "~/features/widgets/widget-card-shell";
import { WidgetGrid, WidgetGridItem } from "~/features/widgets/widget-layout";
import {
  attainmentQuery,
  lifecycleQuery,
  merchantFilterOptionsQuery,
  qualitySummaryQuery,
  rampQuery,
} from "~/lib/queries/dashboards";

import { CulqiView } from "./culqi/culqi-view";
import {
  formatInteger,
  formatMonth,
  formatRatio,
  formatSolesCompact,
} from "./format";
import { AttributionGrid } from "./grids/attribution-grid";
import { CohortGrid } from "./grids/cohort-grid";
import { RecordFilterBar } from "./grids/record-filter-bar";
import { QualityPanel } from "./quality/quality-panel";
import { AggregateTile, BarTile, RampTile } from "./tiles";
import { UploadReport } from "./upload/upload-report";

import styles from "./merchant-gpv-dashboard.module.css";

const EMPTY_OPTIONS = {
  branches: [],
  sellers: [],
  months: [],
  products: [],
};

const EMPTY_ATTAINMENT = {
  sellers: [],
  branches: [],
  coverage: { attributedGpv: 0, totalGpv: 0 },
};

const EMPTY_LIFECYCLE = {
  salesTotal: 0,
  activatedCount: 0,
  medianDaysToActivate: null,
  dormantCount: 0,
  dormantThresholdDays: 30,
};

const EMPTY_QUALITY = {
  conflict: 0,
  late: 0,
  none: 0,
  no_target: 0,
  serial_mismatch: 0,
};

type GpvTabId = "rendimiento" | "cohortes" | "atribucion" | "culqi";

const GPV_TABS: ReadonlyArray<TabItem<GpvTabId>> = [
  { id: "rendimiento", label: "Rendimiento" },
  { id: "cohortes", label: "Cohortes" },
  { id: "atribucion", label: "Atribución" },
  { id: "culqi", label: "Vista Culqi" },
];

const MAX_RAMP_SERIES = 5;

export function MerchantGpvDashboard() {
  const [tab, setTab] = createSignal<GpvTabId>("rendimiento");
  const [showUpload, setShowUpload] = createSignal(false);
  const [filter, setFilter] = createSignal<BookFilter>({});

  const options = createAsync(() => merchantFilterOptionsQuery(), {
    initialValue: EMPTY_OPTIONS,
  });

  const month = createMemo(() => filter().month ?? options().months[0] ?? null);

  const attainment = createAsync(
    () => {
      const current = month();
      return current
        ? attainmentQuery({ filter: filter(), month: current })
        : Promise.resolve(EMPTY_ATTAINMENT);
    },
    { initialValue: EMPTY_ATTAINMENT },
  );

  const ramp = createAsync(() => rampQuery({ filter: filter() }), {
    initialValue: [],
  });
  const lifecycle = createAsync(() => lifecycleQuery({ filter: filter() }), {
    initialValue: EMPTY_LIFECYCLE,
  });
  const quality = createAsync(() => qualitySummaryQuery(), {
    initialValue: EMPTY_QUALITY,
  });

  const rampSeries = createMemo(() =>
    ramp()
      .slice(-MAX_RAMP_SERIES)
      .map((series) => ({
        key: series.saleMonth,
        label: series.saleMonth,
        points: series.points.map((point) => ({
          offset: point.offset,
          value: point.gpv,
        })),
      })),
  );

  const monthLabel = createMemo(() => {
    const current = month();
    return current ? formatMonth(current) : "—";
  });

  // Seller rows exclude unattributed volume; coverage is the full monthly GPV.
  const monthGpv = createMemo(() => attainment().coverage.totalGpv);
  const attributedGpv = createMemo(() => attainment().coverage.attributedGpv);
  const monthTarget = createMemo(() =>
    attainment().sellers.reduce(
      (total, row) => total + (row.projectedGpv ?? 0),
      0,
    ),
  );
  const monthDevices = createMemo(() =>
    attainment().sellers.reduce((total, row) => total + row.deviceCount, 0),
  );

  const activationRate = createMemo(() =>
    formatRatio(lifecycle().activatedCount, lifecycle().salesTotal),
  );

  const latestCohortTarget = createMemo(
    () => ramp().at(-1)?.projectedGpv ?? null,
  );

  return (
    <AppPage>
      <TabStrip
        tabs={GPV_TABS}
        activeTab={tab()}
        onTabSelect={setTab}
        rightComponent={
          <div class={styles.tabActions}>
            <Button
              variant="secondary"
              onClick={() => setShowUpload((v) => !v)}
            >
              Importar reporte
            </Button>
            <Button
              variant="secondary"
              onClick={() => void revalidate(attainmentQuery.key)}
            >
              Recargar
            </Button>
          </div>
        }
      />

      <Show when={showUpload()}>
        <div class={styles.uploadBand}>
          <WidgetCardShell title="Importar reporte GPV">
            <UploadReport onClose={() => setShowUpload(false)} />
          </WidgetCardShell>
        </div>
      </Show>

      {/*
        Record tabs own their scroll through the data grid,
        so they are not nested inside a second one.
      */}
      <Switch>
        <Match when={tab() === "rendimiento"}>
          <RecordFilterBar
            options={options()}
            filter={filter()}
            onChange={(patch) =>
              setFilter((current) => ({ ...current, ...patch }))
            }
          />
          <div class={styles.scrollArea}>
            <ScrollWrapper>
              <WidgetGrid>
                <AggregateTile
                  title={`GPV ${monthLabel()}`}
                  span="quarter"
                  value={formatSolesCompact(monthGpv())}
                  caption={`${formatInteger(monthDevices())} dispositivos activos`}
                />
                {/*
                  How much of the month the board below actually accounts for.
                  Unattributed volume is a steady state, not a backlog, so the
                  ranking is only meaningful next to this number.
                */}
                <AggregateTile
                  title={`Atribución ${monthLabel()}`}
                  span="quarter"
                  value={formatRatio(attributedGpv(), monthGpv())}
                  caption={`${formatSolesCompact(monthGpv() - attributedGpv())} sin asignar`}
                />
                <AggregateTile
                  title={`Cumplimiento ${monthLabel()}`}
                  span="quarter"
                  value={formatRatio(attributedGpv(), monthTarget())}
                  caption={`Objetivo ${formatSolesCompact(monthTarget())}`}
                />
                <AggregateTile
                  title="Tasa de activación"
                  span="quarter"
                  value={activationRate()}
                  caption={
                    lifecycle().medianDaysToActivate == null
                      ? `${formatInteger(lifecycle().salesTotal)} ventas`
                      : `Mediana ${lifecycle().medianDaysToActivate} días hasta activar`
                  }
                />
                <AggregateTile
                  title="Comercios sin transaccionar"
                  span="quarter"
                  value={formatInteger(lifecycle().dormantCount)}
                  caption={`Inactivos hace ${lifecycle().dormantThresholdDays}+ días`}
                />

                <RampTile
                  title="Curva de rampa por cohorte"
                  span="half"
                  series={rampSeries()}
                  target={latestCohortTarget()}
                />

                {/*
                  Each RUC contributes one month of GPV and the projection in
                  force for that month, so the sum is like-for-like. The
                  "Sin asignar" row is one of these and is deliberately not
                  filtered out.
                */}
                <BarTile
                  title={`Cumplimiento ${monthLabel()} por vendedor`}
                  span="half"
                  rows={attainment()
                    .sellers.slice(0, 10)
                    .map((row) => ({
                      key: row.id ?? "unassigned",
                      label: row.label,
                      sublabel: row.sublabel ?? undefined,
                      value: row.gpv,
                      target: row.projectedGpv,
                      href: row.id
                        ? `/settings/members/${row.id}?tab=capacity`
                        : undefined,
                    }))}
                />

                <BarTile
                  title={`Cumplimiento ${monthLabel()} por zonal`}
                  span="half"
                  rows={attainment().branches.map((row) => ({
                    key: row.id ?? "unassigned",
                    label: row.label,
                    value: row.gpv,
                    target: row.projectedGpv,
                  }))}
                />

                <WidgetGridItem span="half">
                  <WidgetCardShell title="Calidad de datos">
                    <QualityPanel summary={quality()} />
                  </WidgetCardShell>
                </WidgetGridItem>
              </WidgetGrid>
            </ScrollWrapper>
          </div>
        </Match>

        <Match when={tab() === "cohortes"}>
          <CohortGrid options={options()} />
        </Match>

        <Match when={tab() === "atribucion"}>
          <AttributionGrid options={options()} />
        </Match>

        <Match when={tab() === "culqi"}>
          <CulqiView options={options()} />
        </Match>
      </Switch>
    </AppPage>
  );
}
