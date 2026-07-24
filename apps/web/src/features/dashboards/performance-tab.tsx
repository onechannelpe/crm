import { createAsync } from "@solidjs/router";
import { createMemo, Index, Show, Suspense, type Accessor } from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state/empty";
import { ScrollWrapper } from "~/components/ui/utilities/scroll-wrapper";
import type { BookFilter } from "~/contracts/merchant-stats/views";
import { WidgetCardShell } from "~/features/widgets/widget-card-shell";
import {
  WidgetGrid,
  WidgetGridItem,
  WidgetStatGrid,
  type WidgetSpan,
} from "~/features/widgets/widget-layout";
import { WidgetSkeleton } from "~/features/widgets/widget-skeleton";
import {
  attainmentQuery,
  lifecycleQuery,
  merchantFilterOptionsQuery,
  qualitySummaryQuery,
  rampQuery,
} from "~/lib/queries/dashboards";
import type { CalendarMonth } from "~/lib/time/calendar-date";

import { AsyncTiles } from "./async-tiles";
import {
  formatInteger,
  formatMonth,
  formatRatio,
  formatSolesCompact,
} from "./format";
import { GpvFilterBar } from "./gpv-filter-bar";
import type { GpvView } from "./gpv-view";
import { QualityPanel } from "./quality/quality-panel";
import { AggregateTile, BarTile, RampTile } from "./tiles";

import styles from "./merchant-gpv-dashboard.module.css";

const MAX_RAMP_SERIES = 5;

const STAT_SPANS: WidgetSpan[] = [
  "quarter",
  "quarter",
  "quarter",
  "quarter",
  "quarter",
];
const CHART_SPANS: WidgetSpan[] = ["half", "half", "half", "half"];

export function PerformanceTab(props: { view: GpvView }) {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <PerformanceContent view={props.view} />
    </Suspense>
  );
}

function PerformanceContent(props: { view: GpvView }) {
  const options = createAsync(() => merchantFilterOptionsQuery());
  const month = createMemo(
    () => props.view.filter().month ?? options()?.months[0] ?? null,
  );

  return (
    <Show
      when={month()}
      fallback={
        <EmptyState
          title="Sin datos de GPV"
          description="Importa un reporte para ver las métricas del panel."
        />
      }
    >
      {(activeMonth) => (
        <>
          <GpvFilterBar view={props.view} />
          <div class={styles.scrollArea}>
            <ScrollWrapper>
              <WidgetStatGrid>
                <AsyncTiles spans={["quarter", "quarter", "quarter"]}>
                  <AttainmentAggregates
                    filter={props.view.filter}
                    month={activeMonth}
                  />
                </AsyncTiles>
                <AsyncTiles spans={["quarter", "quarter"]}>
                  <LifecycleAggregates filter={props.view.filter} />
                </AsyncTiles>
              </WidgetStatGrid>
              <WidgetGrid>
                <AsyncTiles spans={["half"]}>
                  <RampWidget filter={props.view.filter} />
                </AsyncTiles>
                <AsyncTiles spans={["half", "half"]}>
                  <AttainmentBars
                    filter={props.view.filter}
                    month={activeMonth}
                  />
                </AsyncTiles>
                <AsyncTiles spans={["half"]}>
                  <QualityWidget />
                </AsyncTiles>
              </WidgetGrid>
            </ScrollWrapper>
          </div>
        </>
      )}
    </Show>
  );
}

function AttainmentAggregates(props: {
  filter: Accessor<BookFilter>;
  month: Accessor<CalendarMonth>;
}) {
  const attainment = createAsync(() =>
    attainmentQuery({ filter: props.filter(), month: props.month() }),
  );
  const label = () => formatMonth(props.month());

  return (
    <Show when={attainment()}>
      {(data) => {
        const coverage = () => data().coverage;
        const target = () =>
          data().sellers.reduce((sum, row) => sum + (row.projectedGpv ?? 0), 0);
        const devices = () =>
          data().sellers.reduce((sum, row) => sum + row.deviceCount, 0);

        return (
          <>
            <AggregateTile
              title={`GPV ${label()}`}
              span="quarter"
              value={formatSolesCompact(coverage().totalGpv)}
              caption={`${formatInteger(devices())} dispositivos activos`}
            />
            <AggregateTile
              title={`Atribución ${label()}`}
              span="quarter"
              value={formatRatio(coverage().attributedGpv, coverage().totalGpv)}
              caption={`${formatSolesCompact(
                coverage().totalGpv - coverage().attributedGpv,
              )} sin asignar`}
            />
            <AggregateTile
              title={`Cumplimiento ${label()}`}
              span="quarter"
              value={formatRatio(coverage().attributedGpv, target())}
              caption={`Objetivo ${formatSolesCompact(target())}`}
            />
          </>
        );
      }}
    </Show>
  );
}

function LifecycleAggregates(props: { filter: Accessor<BookFilter> }) {
  const lifecycle = createAsync(() =>
    lifecycleQuery({ filter: props.filter() }),
  );

  return (
    <Show when={lifecycle()}>
      {(data) => (
        <>
          <AggregateTile
            title="Tasa de activación"
            span="quarter"
            value={formatRatio(data().activatedCount, data().salesTotal)}
            caption={
              data().medianDaysToActivate == null
                ? `${formatInteger(data().salesTotal)} ventas`
                : `Mediana ${data().medianDaysToActivate} días hasta activar`
            }
          />
          <AggregateTile
            title="Comercios sin transaccionar"
            span="quarter"
            value={formatInteger(data().dormantCount)}
            caption={`Inactivos hace ${data().dormantThresholdDays}+ días`}
          />
        </>
      )}
    </Show>
  );
}

function RampWidget(props: { filter: Accessor<BookFilter> }) {
  const ramp = createAsync(() => rampQuery({ filter: props.filter() }));

  return (
    <Show when={ramp()}>
      {(data) => (
        <RampTile
          title="Curva de rampa por cohorte"
          span="half"
          series={data()
            .slice(-MAX_RAMP_SERIES)
            .map((series) => ({
              key: series.saleMonth,
              label: series.saleMonth,
              points: series.points.map((point) => ({
                offset: point.offset,
                value: point.gpv,
              })),
            }))}
          target={data().at(-1)?.projectedGpv ?? null}
        />
      )}
    </Show>
  );
}

function AttainmentBars(props: {
  filter: Accessor<BookFilter>;
  month: Accessor<CalendarMonth>;
}) {
  const attainment = createAsync(() =>
    attainmentQuery({ filter: props.filter(), month: props.month() }),
  );
  const label = () => formatMonth(props.month());

  return (
    <Show when={attainment()}>
      {(data) => (
        <>
          <BarTile
            title={`Cumplimiento ${label()} por vendedor`}
            span="half"
            rows={data()
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
            title={`Cumplimiento ${label()} por zonal`}
            span="half"
            rows={data().branches.map((row) => ({
              key: row.id ?? "unassigned",
              label: row.label,
              value: row.gpv,
              target: row.projectedGpv,
            }))}
          />
        </>
      )}
    </Show>
  );
}

function QualityWidget() {
  const quality = createAsync(() => qualitySummaryQuery());

  return (
    <Show when={quality()}>
      {(summary) => (
        <WidgetGridItem span="half">
          <WidgetCardShell title="Calidad de datos">
            <QualityPanel summary={summary()} />
          </WidgetCardShell>
        </WidgetGridItem>
      )}
    </Show>
  );
}

function TabSkeleton() {
  return (
    <div class={styles.scrollArea}>
      <ScrollWrapper>
        <WidgetStatGrid>
          <Index each={STAT_SPANS}>
            {(span) => (
              <WidgetGridItem span={span()}>
                <WidgetSkeleton />
              </WidgetGridItem>
            )}
          </Index>
        </WidgetStatGrid>
        <WidgetGrid>
          <Index each={CHART_SPANS}>
            {(span) => (
              <WidgetGridItem span={span()}>
                <WidgetSkeleton />
              </WidgetGridItem>
            )}
          </Index>
        </WidgetGrid>
      </ScrollWrapper>
    </div>
  );
}
