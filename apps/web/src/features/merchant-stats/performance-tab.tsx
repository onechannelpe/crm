import { createAsync } from "@solidjs/router";
import { ErrorBoundary, Index, Show, Suspense } from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state/empty";
import { ScrollWrapper } from "~/components/ui/utilities/scroll-wrapper";
import type { GpvPerformanceView } from "~/contracts/merchant-stats/views";
import { WidgetCardShell } from "~/features/widgets/widget-card-shell";
import {
  WidgetGrid,
  WidgetGridItem,
  WidgetStatGrid,
  type WidgetSpan,
} from "~/features/widgets/widget-layout";
import { WidgetSkeleton } from "~/features/widgets/widget-skeleton";
import { gpvPerformanceViewQuery } from "~/rpc/merchant-stats/gpv-performance-view.query";

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
  const performance = createAsync(() =>
    gpvPerformanceViewQuery({ filter: props.view.filter() }),
  );
  const ready = () => {
    const view = performance();
    return view?.kind === "ready" ? view : null;
  };

  return (
    <div class={styles.surface}>
      <GpvFilterBar view={props.view} />
      <ErrorBoundary fallback={<TabError />}>
        <Suspense fallback={<TabSkeleton />}>
          <Show
            when={ready()}
            fallback={
              <EmptyState
                title="Sin datos de GPV"
                description="Importa un reporte para ver las métricas del panel."
              />
            }
          >
            {(view) => <PerformanceContent view={view()} />}
          </Show>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function PerformanceContent(props: {
  view: Extract<GpvPerformanceView, { kind: "ready" }>;
}) {
  const label = () => formatMonth(props.view.month);
  const target = () =>
    props.view.attainment.sellers.reduce(
      (sum, row) => sum + (row.projectedGpv ?? 0),
      0,
    );
  const devices = () =>
    props.view.attainment.sellers.reduce(
      (sum, row) => sum + row.deviceCount,
      0,
    );

  return (
    <div class={styles.scrollArea}>
      <ScrollWrapper>
        <WidgetStatGrid>
          <AggregateTile
            title={`GPV ${label()}`}
            span="quarter"
            value={formatSolesCompact(props.view.attainment.coverage.totalGpv)}
            caption={`${formatInteger(devices())} dispositivos activos`}
          />
          <AggregateTile
            title={`Atribución ${label()}`}
            span="quarter"
            value={formatRatio(
              props.view.attainment.coverage.attributedGpv,
              props.view.attainment.coverage.totalGpv,
            )}
            caption={`${formatSolesCompact(
              props.view.attainment.coverage.totalGpv -
                props.view.attainment.coverage.attributedGpv,
            )} sin asignar`}
          />
          <AggregateTile
            title={`Cumplimiento ${label()}`}
            span="quarter"
            value={formatRatio(
              props.view.attainment.coverage.attributedGpv,
              target(),
            )}
            caption={`Objetivo ${formatSolesCompact(target())}`}
          />
          <AggregateTile
            title="Tasa de activación"
            span="quarter"
            value={formatRatio(
              props.view.lifecycle.activatedCount,
              props.view.lifecycle.salesTotal,
            )}
            caption={
              props.view.lifecycle.medianDaysToActivate == null
                ? `${formatInteger(props.view.lifecycle.salesTotal)} ventas`
                : `Mediana ${props.view.lifecycle.medianDaysToActivate} días hasta activar`
            }
          />
          <AggregateTile
            title="Comercios sin transaccionar"
            span="quarter"
            value={formatInteger(props.view.lifecycle.dormantCount)}
            caption={`Inactivos hace ${props.view.lifecycle.dormantThresholdDays}+ días`}
          />
        </WidgetStatGrid>

        <WidgetGrid>
          <RampTile
            title="Curva de rampa por cohorte"
            span="half"
            series={props.view.ramp.slice(-MAX_RAMP_SERIES).map((series) => ({
              key: series.saleMonth,
              label: series.saleMonth,
              points: series.points.map((point) => ({
                offset: point.offset,
                value: point.gpv,
              })),
            }))}
            target={props.view.ramp.at(-1)?.projectedGpv ?? null}
          />
          <BarTile
            title={`Cumplimiento ${label()} por vendedor`}
            span="half"
            rows={props.view.attainment.sellers.slice(0, 10).map((row) => ({
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
            rows={props.view.attainment.branches.map((row) => ({
              key: row.id ?? "unassigned",
              label: row.label,
              value: row.gpv,
              target: row.projectedGpv,
            }))}
          />
          <WidgetGridItem span="half">
            <WidgetCardShell title="Calidad de datos">
              <QualityPanel summary={props.view.quality} />
            </WidgetCardShell>
          </WidgetGridItem>
        </WidgetGrid>
      </ScrollWrapper>
    </div>
  );
}

function TabError() {
  return (
    <div class={styles.scrollArea}>
      <WidgetCardShell title="Rendimiento GPV" status="error">
        <span />
      </WidgetCardShell>
    </div>
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
