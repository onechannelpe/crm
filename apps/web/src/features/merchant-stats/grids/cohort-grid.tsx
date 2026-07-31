import { ErrorBoundary, Suspense } from "solid-js";

import CalendarDays from "~/components/icons/calendar-days";
import ChartColumn from "~/components/icons/chart-column";
import Package from "~/components/icons/package";
import User from "~/components/icons/user";
import type { CohortSaleRow, GpvPoint } from "~/contracts/merchant-stats/views";
import { COHORT_OFFSETS } from "~/contracts/merchant-stats/vocabulary";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridSource } from "~/features/data-grid/model/source";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { useSidePanelRowOpen } from "~/features/side-panel/hooks/use-side-panel-row-open";
import { createDataGridDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import { cohortRowsQuery } from "~/rpc/merchant-stats/cohort-rows.query";

import { formatInteger, formatMonth, formatSolesCompact } from "../format";
import { GpvFilterBar } from "../gpv-filter-bar";
import type { GpvView } from "../gpv-view";
import { GPV_GRID_PAGE_SIZE, useDashboardGrid } from "./use-dashboard-grid";

import styles from "./grid-surface.module.css";

function pointAt(row: CohortSaleRow, offset: number): GpvPoint | null {
  return row.months.find((month) => month.offset === offset) ?? null;
}

function formatGpvAt(row: CohortSaleRow, offset: number): string {
  const point = pointAt(row, offset);
  return point ? formatSolesCompact(point.gpv) : "—";
}

function formatPointAt(row: CohortSaleRow, offset: number): string {
  const point = pointAt(row, offset);
  return point
    ? `${formatSolesCompact(point.gpv)} · ${formatInteger(point.trx)}`
    : "—";
}

const COLUMNS = [
  {
    key: "comercial",
    label: "Comercial",
    icon: ChartColumn,
    minWidth: 200,
    grow: true,
    sticky: true,
    renderCell: (row) => row.tradeName ?? row.ruc,
  },
  {
    key: "product",
    label: "Producto",
    icon: Package,
    width: 130,
    renderCell: (row) => row.product,
  },
  {
    key: "seller",
    label: "Vendedor",
    icon: User,
    width: 170,
    renderCell: (row) => row.sellerName ?? "Sin asignar",
  },
  {
    key: "saleMonth",
    label: "Mes venta",
    icon: CalendarDays,
    width: 110,
    renderCell: (row) => formatMonth(row.saleMonth),
  },
  {
    key: "m0",
    label: "M0",
    icon: ChartColumn,
    width: 110,
    renderCell: (row) => formatGpvAt(row, 0),
  },
  // M0+15D includes M0 through day 15 of M1.
  {
    key: "m0_plus_15d",
    label: "M0+15D",
    icon: ChartColumn,
    width: 110,
    renderCell: (row) =>
      row.m0Plus15d ? formatSolesCompact(row.m0Plus15d.gpv) : "—",
  },
  {
    key: "m1",
    label: "M1",
    icon: ChartColumn,
    width: 110,
    renderCell: (row) => formatGpvAt(row, 1),
  },
  {
    key: "m2",
    label: "M2",
    icon: ChartColumn,
    width: 110,
    renderCell: (row) => formatGpvAt(row, 2),
  },
  {
    key: "m3",
    label: "M3",
    icon: ChartColumn,
    width: 110,
    renderCell: (row) => formatGpvAt(row, 3),
  },
  {
    key: "projected",
    label: "Proyectado",
    icon: ChartColumn,
    width: 120,
    renderCell: (row) =>
      row.projectedGpv != null ? formatSolesCompact(row.projectedGpv) : "—",
  },
] satisfies ReadonlyArray<DataGridColumn<CohortSaleRow>>;

export function CohortGrid(props: { view: GpvView }) {
  const grid = useDashboardGrid<CohortSaleRow>({
    pageSize: GPV_GRID_PAGE_SIZE,
    resetKey: () => JSON.stringify(props.view.filter()),
    load: (page) => cohortRowsQuery({ filter: props.view.filter(), page }),
  });

  const rowOpen = useSidePanelRowOpen<CohortSaleRow>((row) =>
    createDataGridDetailSidePanelPage({
      title: row.tradeName ?? row.ruc,
      subtitle: `${row.product} · ${row.ruc}`,
      items: [
        { label: "Serie", value: row.serialNumber ?? "—" },
        { label: "Vendedor", value: row.sellerName ?? "Sin asignar" },
        { label: "Zonal", value: row.branchName ?? "—" },
        { label: "Mes de venta", value: formatMonth(row.saleMonth) },
        {
          label: "Proyectado mensual",
          value:
            row.projectedGpv != null
              ? formatSolesCompact(row.projectedGpv)
              : "—",
        },
        ...COHORT_OFFSETS.map((offset) => ({
          label: `M${offset} (GPV / TRX)`,
          value: formatPointAt(row, offset),
        })),
        {
          label: "M0+15D (GPV / TRX)",
          value: row.m0Plus15d
            ? `${formatSolesCompact(row.m0Plus15d.gpv)} · ${formatInteger(
                row.m0Plus15d.trx,
              )}`
            : "—",
        },
      ],
    }),
  );

  const renderGrid = (source: DataGridSource<CohortSaleRow>) => (
    <DataGrid
      ariaLabel="Cohortes de ventas"
      columns={COLUMNS}
      emptyState="No hay ventas para los filtros actuales."
      onRowOpen={rowOpen}
      rowId={(row) => row.saleId}
      rowOpenIndicator="panel"
      loadMore={{
        hasMore: grid.hasMore(),
        loading: grid.loading(),
        onLoadMore: grid.onLoadMore,
      }}
      source={source}
    />
  );

  return (
    <div class={styles.surface}>
      <GpvFilterBar view={props.view} />
      <ErrorBoundary fallback={renderGrid({ status: "error", rows: [] })}>
        <Suspense fallback={renderGrid({ status: "pending", rows: [] })}>
          {renderGrid({ status: "ready", rows: grid.rows() })}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
