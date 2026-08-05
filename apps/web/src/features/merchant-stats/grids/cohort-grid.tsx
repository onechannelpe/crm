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

import { formatInteger, formatMonth, formatSolesCompact } from "../format";
import { GpvFilterBar } from "../gpv-filter-bar";
import type { GpvView } from "../gpv-view";
import { useCohortRowsGrid } from "./use-cohort-rows-grid";

import styles from "./grid-surface.module.css";

function pointAt(row: CohortSaleRow, offset: number): GpvPoint | null {
  return row.months.find((month) => month.offset === offset) ?? null;
}

function formatGpv(point: GpvPoint | null): string | null {
  return point ? formatSolesCompact(point.gpv) : null;
}

function formatGpvAndTrx(point: GpvPoint | null): string | null {
  return point
    ? `${formatSolesCompact(point.gpv)} · ${formatInteger(point.trx)}`
    : null;
}

const COHORT_COLUMNS = [
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
    renderCell: (row) => row.sellerName,
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
    renderCell: (row) => formatGpv(pointAt(row, 0)),
  },
  // Covers M0 and the first 15 days of M1.
  {
    key: "m0_plus_15d",
    label: "M0+15D",
    icon: ChartColumn,
    width: 110,
    renderCell: (row) => formatGpv(row.m0Plus15d),
  },
  {
    key: "m1",
    label: "M1",
    icon: ChartColumn,
    width: 110,
    renderCell: (row) => formatGpv(pointAt(row, 1)),
  },
  {
    key: "m2",
    label: "M2",
    icon: ChartColumn,
    width: 110,
    renderCell: (row) => formatGpv(pointAt(row, 2)),
  },
  {
    key: "m3",
    label: "M3",
    icon: ChartColumn,
    width: 110,
    renderCell: (row) => formatGpv(pointAt(row, 3)),
  },
  {
    key: "projected",
    label: "Proyectado",
    icon: ChartColumn,
    width: 120,
    renderCell: (row) =>
      row.projectedGpv == null ? null : formatSolesCompact(row.projectedGpv),
  },
] satisfies ReadonlyArray<DataGridColumn<CohortSaleRow>>;

export function CohortGrid(props: { view: GpvView }) {
  const grid = useCohortRowsGrid(props.view);

  const rowOpen = useSidePanelRowOpen<CohortSaleRow>((row) =>
    createDataGridDetailSidePanelPage({
      title: row.tradeName ?? row.ruc,
      subtitle: `${row.product} · ${row.ruc}`,
      items: [
        { label: "Serie", value: row.serialNumber },
        { label: "Vendedor", value: row.sellerName },
        { label: "Zonal", value: row.branchName },
        { label: "Mes de venta", value: formatMonth(row.saleMonth) },
        {
          label: "Proyectado mensual",
          value:
            row.projectedGpv == null
              ? null
              : formatSolesCompact(row.projectedGpv),
        },
        ...COHORT_OFFSETS.map((offset) => ({
          label: `M${offset} (GPV / TRX)`,
          value: formatGpvAndTrx(pointAt(row, offset)),
        })),
        {
          label: "M0+15D (GPV / TRX)",
          value: formatGpvAndTrx(row.m0Plus15d),
        },
      ],
    }),
  );

  const renderGrid = (source: DataGridSource<CohortSaleRow>) => (
    <DataGrid
      ariaLabel="Cohortes de ventas"
      columns={COHORT_COLUMNS}
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
          {renderGrid({
            status: "ready",
            rows: grid.rows(),
          })}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
