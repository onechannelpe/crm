import { createAsync, revalidate } from "@solidjs/router";
import { createMemo, createSignal, Match, Show, Switch } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { ScrollWrapper } from "~/components/ui/utilities/scroll-wrapper";
import {
  TabStrip,
  type TabItem,
} from "~/features/side-panel/components/tab-strip";
import { WidgetCardShell } from "~/features/widgets/widget-card-shell";
import { WidgetGrid, WidgetGridItem } from "~/features/widgets/widget-layout";
import {
  merchantFilterOptionsQuery,
  merchantPerformanceQuery,
} from "~/lib/queries/dashboards";
import type { CohortRampSeries } from "~/server/merchant-stats/read/contracts";

import { DataQualityTable } from "./data-quality-table";
import {
  formatInteger,
  formatMonth,
  formatRatio,
  formatSolesCompact,
  trendPercentage,
} from "./format";
import { AccountsGrid } from "./grids/accounts-grid";
import { CohortGrid } from "./grids/cohort-grid";
import { AggregateTile, BarTile, RampTile } from "./tiles";
import { UploadReport } from "./upload/upload-report";

import styles from "./merchant-gpv-dashboard.module.css";

const EMPTY_PERFORMANCE = {
  ramp: [],
  sellers: [],
  branches: [],
  lifecycle: {
    salesTotal: 0,
    activatedCount: 0,
    medianDaysToActivate: null,
    dormantCount: 0,
    dormantThresholdDays: 30,
  },
  dataQuality: {
    unmatchedRucs: 0,
    accountsMissingSeller: 0,
    accountsMissingProjected: 0,
    accountsMissingBranch: 0,
    serialMismatches: 0,
  },
};

type GpvTabId = "rendimiento" | "cohortes" | "atribucion";

const GPV_TABS: ReadonlyArray<TabItem<GpvTabId>> = [
  { id: "rendimiento", label: "Rendimiento" },
  { id: "cohortes", label: "Cohortes" },
  { id: "atribucion", label: "Atribución" },
];

// Attainment is read at m0: the sale month is the only step every cohort has
// reached, so it is the one comparison that is never half-empty. Exported so a
// route preload warms the same cache entry the component reads.
export const ATTAINMENT_OFFSET = 0;

// More lines than this and the cohort curve stops being readable, whatever the
// palette does. Newest cohorts are the ones anyone is asking about.
const MAX_RAMP_SERIES = 5;

export function MerchantGpvDashboard() {
  const [tab, setTab] = createSignal<GpvTabId>("rendimiento");
  const [showUpload, setShowUpload] = createSignal(false);

  const performance = createAsync(
    () => merchantPerformanceQuery(ATTAINMENT_OFFSET),
    { initialValue: EMPTY_PERFORMANCE },
  );
  const options = createAsync(() => merchantFilterOptionsQuery(), {
    initialValue: { branches: [], sellers: [], saleMonths: [], products: [] },
  });

  // Newest cohorts last so the ramp reads left-to-right oldest-to-newest inside
  // the window, matching how the legend is scanned.
  const rampSeries = createMemo(() =>
    performance()
      .ramp.slice(-MAX_RAMP_SERIES)
      .map((series) => ({
        key: series.saleMonth,
        label: series.saleMonth,
        points: series.points.map((point) => ({
          offset: point.offset,
          value: point.gpv,
        })),
      })),
  );

  const latestCohort = createMemo(() => performance().ramp.at(-1));
  const priorCohort = createMemo(() => performance().ramp.at(-2));

  const gpvAt = (series: CohortRampSeries | undefined, offset: number) =>
    series?.points.find((point) => point.offset === offset)?.gpv;

  const latestGpv = createMemo(() => gpvAt(latestCohort(), ATTAINMENT_OFFSET));
  const priorGpv = createMemo(() => gpvAt(priorCohort(), ATTAINMENT_OFFSET));

  // Attainment is a ratio of the same two quantities in both cohorts, so its
  // period-over-period movement is a like-for-like comparison.
  const attainment = (series: CohortRampSeries | undefined) => {
    const gpv = gpvAt(series, ATTAINMENT_OFFSET);
    if (gpv === undefined || !series?.projectedGpv) return undefined;
    return gpv / series.projectedGpv;
  };

  // "Jun 26", or an em dash before the first import lands.
  const cohortLabel = createMemo(() => {
    const cohort = latestCohort();
    return cohort ? formatMonth(cohort.saleMonth) : "—";
  });

  const activationRate = createMemo(() => {
    const { activatedCount, salesTotal } = performance().lifecycle;
    return formatRatio(activatedCount, salesTotal);
  });

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
              onClick={() => void revalidate(merchantPerformanceQuery.key)}
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

      {/* One ScrollWrapper per surface, mirroring Twenty's PageLayoutTabsRenderer.
          The record tabs own their scroll through the data grid, so they are not
          nested inside a second one. */}
      <Switch>
        <Match when={tab() === "rendimiento"}>
          <div class={styles.scrollArea}>
            <ScrollWrapper>
              <WidgetGrid>
                <AggregateTile
                  title={`GPV ${cohortLabel()}`}
                  span="quarter"
                  value={formatSolesCompact(latestGpv() ?? 0)}
                  caption={`${formatInteger(latestCohort()?.deviceCount ?? 0)} comercios vendidos`}
                  trendPercentage={trendPercentage(latestGpv(), priorGpv())}
                />
                <AggregateTile
                  title={`Cumplimiento ${cohortLabel()}`}
                  span="quarter"
                  value={formatRatio(
                    latestGpv() ?? 0,
                    latestCohort()?.projectedGpv ?? 0,
                  )}
                  caption={`Objetivo ${formatSolesCompact(latestCohort()?.projectedGpv ?? 0)}`}
                  trendPercentage={trendPercentage(
                    attainment(latestCohort()),
                    attainment(priorCohort()),
                  )}
                />
                <AggregateTile
                  title="Tasa de activación"
                  span="quarter"
                  value={activationRate()}
                  caption={
                    performance().lifecycle.medianDaysToActivate == null
                      ? `${formatInteger(performance().lifecycle.salesTotal)} ventas`
                      : `Mediana ${performance().lifecycle.medianDaysToActivate} días hasta activar`
                  }
                />
                <AggregateTile
                  title="Comercios sin transaccionar"
                  span="quarter"
                  value={formatInteger(performance().lifecycle.dormantCount)}
                  caption={`Inactivos hace ${performance().lifecycle.dormantThresholdDays}+ días`}
                />

                <RampTile
                  title="Curva de rampa por cohorte"
                  span="half"
                  series={rampSeries()}
                  target={latestCohort()?.projectedGpv ?? null}
                />

                {/* Every RUC contributes exactly one M0 and one monthly target
                    here, so the sum stays like-for-like: first-month GPV against
                    the target that month was measured against. */}
                <BarTile
                  title="Cumplimiento M0 por vendedor"
                  span="half"
                  rows={performance()
                    .sellers.slice(0, 10)
                    .map((row) => ({
                      key: row.key,
                      label: row.label,
                      sublabel: row.sublabel ?? undefined,
                      value: row.gpv,
                      target: row.projectedGpv || null,
                      // The seller filter used to be the only way to read one
                      // person's book. Grouping shows every seller at once and the
                      // row links to the record, which is what the filter was
                      // standing in for.
                      href: row.userId
                        ? `/settings/members/${row.userId}?tab=capacity`
                        : undefined,
                    }))}
                />

                <BarTile
                  title="Cumplimiento M0 por zonal"
                  span="half"
                  rows={performance().branches.map((row) => ({
                    key: row.key,
                    label: row.label,
                    value: row.gpv,
                    target: row.projectedGpv || null,
                  }))}
                />

                <WidgetGridItem span="half">
                  <WidgetCardShell title="Calidad de datos">
                    <DataQualityTable summary={performance().dataQuality} />
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
          <AccountsGrid options={options()} />
        </Match>
      </Switch>
    </AppPage>
  );
}
