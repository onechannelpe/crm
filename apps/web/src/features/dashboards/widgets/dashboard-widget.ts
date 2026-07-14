import type { BusinessStatsOverview } from "~/actions/dashboards/dashboard";
import type { WidgetSpan } from "~/features/page-layout/types";

import type { BarRow } from "../charts/bar-list";
import type { LinePoint } from "../charts/line-chart";
import { formatInteger, formatPercent, formatSolesCompact } from "../format";

export type MetricTone = "default" | "positive" | "warning";

export interface StatRow {
  label: string;
  value: string;
  alert: boolean;
}

interface WidgetBase {
  id: string;
  title: string;
  subtitle?: string;
  span: WidgetSpan;
}

// Presentational dashboard widgets: a snapshot of the read model projected into
// exactly what each content component draws. The two interactive data grids
// (cohort, accounts) are mounted directly by the page with live filter props
// rather than modeled here, so revalidating the overview never remounts them.
export type DashboardWidget =
  | (WidgetBase & {
      type: "metric";
      value: string;
      tone: MetricTone;
      hint?: string;
    })
  | (WidgetBase & { type: "line"; points: LinePoint[]; target: number | null })
  | (WidgetBase & { type: "bar"; rows: BarRow[] })
  | (WidgetBase & { type: "stat-rows"; rows: StatRow[] });

export function buildMerchantGpvWidgets(
  overview: BusinessStatsOverview,
): DashboardWidget[] {
  const currentMonthGpv = overview.monthly.at(-1)?.gpv ?? 0;
  const totalProjected = overview.sellers.reduce(
    (sum, row) => sum + row.projectedGpv,
    0,
  );
  const totalRucs = overview.sellers.reduce(
    (sum, row) => sum + row.rucCount,
    0,
  );
  const attainment =
    totalProjected > 0 ? currentMonthGpv / totalProjected : null;
  const dq = overview.dataQuality;

  return [
    {
      id: "gpv-current",
      type: "metric",
      title: "GPV mes actual",
      span: "quarter",
      value: formatSolesCompact(currentMonthGpv),
      tone: "default",
    },
    {
      id: "gpv-target",
      type: "metric",
      title: "Objetivo mensual",
      span: "quarter",
      value: formatSolesCompact(totalProjected),
      tone: "default",
    },
    {
      id: "gpv-attainment",
      type: "metric",
      title: "Cumplimiento",
      span: "quarter",
      value: attainment != null ? formatPercent(attainment) : "—",
      tone: attainment != null && attainment >= 1 ? "positive" : "default",
    },
    {
      id: "gpv-unmatched",
      type: "metric",
      title: "RUCs sin CRM",
      span: "quarter",
      value: formatInteger(dq.unmatchedRucs),
      tone: dq.unmatchedRucs > 0 ? "warning" : "default",
      hint: `${formatInteger(totalRucs)} RUCs atribuidos`,
    },
    {
      id: "gpv-monthly",
      type: "line",
      title: "GPV realizado por mes",
      span: "full",
      points: overview.monthly.map((point) => ({
        label: point.month,
        value: point.gpv,
      })),
      target: totalProjected || null,
    },
    {
      id: "gpv-by-seller",
      type: "bar",
      title: "Rendimiento por vendedor",
      subtitle: "Barra: GPV realizado · marca: objetivo proyectado",
      span: "half",
      rows: overview.sellers.slice(0, 8).map((row) => ({
        key: row.sellerKey,
        label: row.sellerName,
        value: row.gpv,
        target: row.projectedGpv || null,
      })),
    },
    {
      id: "data-quality",
      type: "stat-rows",
      title: "Calidad de datos",
      span: "half",
      rows: [
        {
          label: "RUCs sin registrar en CRM",
          value: formatInteger(dq.unmatchedRucs),
          alert: dq.unmatchedRucs > 0,
        },
        {
          label: "Cuentas sin vendedor real",
          value: formatInteger(dq.accountsMissingSeller),
          alert: dq.accountsMissingSeller > 0,
        },
        {
          label: "Cuentas sin proyectado",
          value: formatInteger(dq.accountsMissingProjected),
          alert: dq.accountsMissingProjected > 0,
        },
        {
          label: "Series que no cuadran con entregas",
          value: formatInteger(dq.serialMismatches),
          alert: dq.serialMismatches > 0,
        },
      ],
    },
  ];
}
