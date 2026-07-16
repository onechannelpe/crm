import { createMemo, createResource, createSignal } from "solid-js";

import CalendarDays from "~/components/icons/calendar-days";
import ChartColumn from "~/components/icons/chart-column";
import Package from "~/components/icons/package";
import User from "~/components/icons/user";
import type {
  BookFilter,
  CohortSaleRow,
  FilterOptions,
} from "~/contracts/merchant-stats/views";
import { COHORT_OFFSETS } from "~/contracts/merchant-stats/vocabulary";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { useSidePanelRowOpen } from "~/features/side-panel/hooks/use-side-panel-row-open";
import { createDataGridDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import { cohortRowsQuery } from "~/lib/queries/dashboards";

import { formatInteger, formatMonth, formatSolesCompact } from "../format";
import { RecordFilterBar } from "./record-filter-bar";

import styles from "./grid-surface.module.css";

const PAGE = 60;

type Row = CohortSaleRow & { id: string };

function gpvAt(row: Row, offset: number): number {
  return row.months.find((month) => month.offset === offset)?.gpv ?? 0;
}

function trxAt(row: Row, offset: number): number {
  return row.months.find((month) => month.offset === offset)?.trx ?? 0;
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
  // Cumulative through the first 15 days of M1, overlaps M0. Sits next to M0
  // because that is the pair a reader compares.
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

export function CohortGrid(props: { options: FilterOptions }) {
  const [filter, setFilter] = createSignal<BookFilter>({});
  const [limit, setLimit] = createSignal(PAGE);

  const [page] = createResource(
    () => ({ filter: filter(), limit: limit() }),
    (input) =>
      cohortRowsQuery({
        filter: input.filter,
        page: { limit: input.limit, offset: 0 },
      }),
  );

  const rows = createMemo<Row[]>(() =>
    // eslint-disable-next-line oxc/no-map-spread
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
        {
          label: "Proyectado mensual",
          value:
            row.projectedGpv != null
              ? formatSolesCompact(row.projectedGpv)
              : "—",
        },
        ...COHORT_OFFSETS.map((offset) => ({
          label: `M${offset} (GPV / TRX)`,
          value: `${formatSolesCompact(gpvAt(row, offset))} · ${formatInteger(
            trxAt(row, offset),
          )}`,
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

  return (
    <div class={styles.surface}>
      <RecordFilterBar
        options={props.options}
        filter={filter()}
        onChange={(patch) => {
          setFilter((current) => ({ ...current, ...patch }));
          setLimit(PAGE);
        }}
      />
      <DataGrid
        ariaLabel="Cohortes de ventas"
        columns={COLUMNS}
        emptyState="No hay ventas para los filtros actuales."
        onRowOpen={rowOpen}
        rowOpenIndicator="panel"
        loadMore={{
          hasMore: rows().length >= limit(),
          loading: page.state === "pending" || page.state === "refreshing",
          onLoadMore: () => void setLimit((value) => value + PAGE),
        }}
        source={{
          status: page.state === "errored" ? "error" : "ready",
          rows: rows(),
        }}
      />
    </div>
  );
}
