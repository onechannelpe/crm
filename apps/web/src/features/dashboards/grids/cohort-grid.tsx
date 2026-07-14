import { createMemo, createResource, createSignal } from "solid-js";

import CalendarDays from "~/components/icons/calendar-days";
import ChartColumn from "~/components/icons/chart-column";
import Package from "~/components/icons/package";
import User from "~/components/icons/user";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { useSidePanelRowOpen } from "~/features/side-panel/hooks/use-side-panel-row-open";
import { createDataGridDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import { cohortRowsQuery } from "~/lib/queries/dashboards";
import type {
  BusinessStatsFilters,
  CohortGridRow,
} from "~/server/merchant-stats/read/contracts";

import { formatInteger, formatMonth, formatSolesCompact } from "../format";

const PAGE = 60;

type Row = CohortGridRow & { id: string };

function gpvAt(row: Row, offset: number): number {
  return row.months.find((m) => m.offset === offset)?.gpv ?? 0;
}
function trxAt(row: Row, offset: number): number {
  return row.months.find((m) => m.offset === offset)?.trx ?? 0;
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
    renderCell: (row) => formatSolesCompact(gpvAt(row, 0)),
  },
  {
    key: "m0_15",
    label: "M0+15",
    icon: ChartColumn,
    width: 110,
    renderCell: (row) =>
      row.last15dGpv != null ? formatSolesCompact(row.last15dGpv) : "—",
  },
  {
    key: "m1",
    label: "M1",
    icon: ChartColumn,
    width: 110,
    renderCell: (row) => formatSolesCompact(gpvAt(row, 1)),
  },
  {
    key: "m2",
    label: "M2",
    icon: ChartColumn,
    width: 110,
    renderCell: (row) => formatSolesCompact(gpvAt(row, 2)),
  },
  {
    key: "m3",
    label: "M3",
    icon: ChartColumn,
    width: 110,
    renderCell: (row) => formatSolesCompact(gpvAt(row, 3)),
  },
  {
    key: "projected",
    label: "Proyectado",
    icon: ChartColumn,
    width: 120,
    renderCell: (row) =>
      row.projectedGpv != null ? formatSolesCompact(row.projectedGpv) : "—",
  },
] satisfies ReadonlyArray<DataGridColumn<Row>>;

export function CohortGrid(props: { filters: BusinessStatsFilters }) {
  const [limit, setLimit] = createSignal(PAGE);

  const [page] = createResource(
    () => ({ filters: props.filters, limit: limit() }),
    (input) =>
      cohortRowsQuery({
        filters: input.filters,
        page: { limit: input.limit, offset: 0 },
      }),
  );

  const rows = createMemo<Row[]>(() =>
    (page.latest ?? []).map((row) => ({ ...row, id: row.saleId })),
  );

  const rowOpen = useSidePanelRowOpen<Row>((row) =>
    createDataGridDetailSidePanelPage({
      title: row.tradeName ?? row.ruc,
      subtitle: `${row.product} · ${row.ruc}`,
      items: [
        { label: "Serie", value: row.serialNumber ?? "—" },
        { label: "Vendedor", value: row.sellerName ?? "Sin asignar" },
        { label: "Zonal", value: row.branchName ?? "—" },
        { label: "Mes de venta", value: formatMonth(row.saleMonth) },
        ...[0, 1, 2, 3].map((offset) => ({
          label: `M${offset} (GPV / TRX)`,
          value: `${formatSolesCompact(gpvAt(row, offset))} · ${formatInteger(
            trxAt(row, offset),
          )}`,
        })),
      ],
    }),
  );

  return (
    <DataGrid
      ariaLabel="Cohortes de ventas"
      columns={COLUMNS}
      emptyState={
        <p class="px-3 py-4 text-sm text-muted-foreground">
          No hay ventas para los filtros actuales.
        </p>
      }
      onRowOpen={rowOpen}
      rowOpenIndicator="panel"
      loadMore={{
        hasMore: rows().length >= limit(),
        loading: page.state === "pending" || page.state === "refreshing",
        onLoadMore: () => setLimit((value) => value + PAGE),
      }}
      source={{
        status: page.state === "errored" ? "error" : "ready",
        rows: rows(),
      }}
    />
  );
}
