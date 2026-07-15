import { revalidate } from "@solidjs/router";
import { createMemo, createResource, createSignal } from "solid-js";

import {
  resolveAttribution,
  setMerchantTarget,
} from "~/actions/dashboards/attribution";
import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import ChartColumn from "~/components/icons/chart-column";
import User from "~/components/icons/user";
import { Present } from "~/components/ui/control-flow/present";
import { Badge } from "~/components/ui/display/badge";
import {
  InlineFieldEditor,
  InlineOptionsEditor,
} from "~/components/ui/input/inline-field-editor";
import type {
  BookFilter,
  CohortSaleRow,
  FilterOptions,
} from "~/contracts/merchant-stats/views";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import {
  attainmentQuery,
  cohortRowsQuery,
  merchantFilterOptionsQuery,
  qualitySummaryQuery,
} from "~/lib/queries/dashboards";

import { formatMonth, formatSoles } from "../format";
import { RecordFilterBar } from "./record-filter-bar";

import styles from "./grid-surface.module.css";

const PAGE_SIZE = 60;
const UNASSIGNED = "Sin asignar";

type Row = CohortSaleRow & {
  id: string;
};

async function revalidateAttributionData(): Promise<void> {
  await Promise.all([
    revalidate(cohortRowsQuery.key),
    revalidate(attainmentQuery.key),
    revalidate(merchantFilterOptionsQuery.key),
    revalidate(qualitySummaryQuery.key),
  ]);
}

export function AttributionGrid(props: { options: FilterOptions }) {
  const [filter, setFilter] = createSignal<BookFilter>({});
  const [limit, setLimit] = createSignal(PAGE_SIZE);

  const [cohortRows] = createResource(
    () => ({
      filter: filter(),
      limit: limit(),
    }),
    (input) =>
      cohortRowsQuery({
        filter: input.filter,
        page: {
          limit: input.limit,
          offset: 0,
        },
      }),
  );

  const rows = createMemo<Row[]>(() =>
    // eslint-disable-next-line oxc/no-map-spread
    (cohortRows.latest ?? []).map((row) => ({
      ...row,
      id: row.saleId,
    })),
  );

  const columns = createMemo<ReadonlyArray<DataGridColumn<Row>>>(() => [
    {
      key: "ruc",
      label: "Comercio",
      icon: Building2,
      minWidth: 200,
      sticky: true,
      grow: true,
      renderCell: (row) => row.tradeName ?? row.ruc,
    },
    {
      key: "saleMonth",
      label: "Mes de venta",
      icon: CalendarDays,
      width: 130,
      renderCell: (row) => formatMonth(row.saleMonth),
    },
    {
      key: "seller",
      label: "Vendedor real",
      icon: User,
      width: 190,
      renderCell: (row) => row.sellerName ?? UNASSIGNED,
      edit: {
        ariaLabel: "Editar vendedor",
        renderEditor: (editor) => (
          <InlineOptionsEditor
            ariaLabel="Vendedor real"
            options={[
              UNASSIGNED,
              ...props.options.sellers.map((seller) => seller.name),
            ]}
            selected={editor.row.sellerName ?? UNASSIGNED}
            onSubmit={async (name) => {
              const seller = props.options.sellers.find(
                (candidate) => candidate.name === name,
              );

              await resolveAttribution({
                ruc: editor.row.ruc,
                month: editor.row.saleMonth,
                sellerUserId: seller?.userId ?? null,
                branchId: null,
              });

              await revalidateAttributionData();
            }}
            onClose={editor.close}
          />
        ),
      },
    },
    {
      key: "culqiUser",
      label: "Usuario Culqi",
      icon: User,
      width: 170,
      renderCell: (row) => row.culqiUserName ?? "—",
    },
    {
      key: "branch",
      label: "Zonal",
      icon: Building2,
      width: 150,
      renderCell: (row) => row.branchName ?? "—",
    },
    {
      key: "projected",
      label: "Proyectado",
      icon: ChartColumn,
      width: 170,
      renderCell: (row) => (
        <Present
          when={row.projectedGpv}
          fallback={<Badge variant="warning">Sin proyectado</Badge>}
        >
          {(projectedGpv) => formatSoles(projectedGpv())}
        </Present>
      ),
      edit: {
        ariaLabel: "Editar proyectado",
        renderEditor: (editor) => (
          <InlineFieldEditor
            ariaLabel={`Proyectado desde ${formatMonth(editor.row.saleMonth)}`}
            type="number"
            min="0"
            initialValue={editor.row.projectedGpv?.toString() ?? ""}
            onSubmit={async (value) => {
              const trimmed = value.trim();
              const projectedGpv = trimmed === "" ? null : Number(trimmed);

              if (projectedGpv !== null && !Number.isFinite(projectedGpv)) {
                throw new Error("Ingresa un proyectado numérico válido");
              }

              await setMerchantTarget({
                ruc: editor.row.ruc,
                effectiveFrom: editor.row.saleMonth,
                projectedGpv,
              });

              await revalidateAttributionData();
            }}
            onClose={editor.close}
          />
        ),
      },
    },
    {
      key: "product",
      label: "Producto",
      icon: ChartColumn,
      width: 130,
      renderCell: (row) => row.product,
    },
  ]);

  return (
    <div class={styles.surface}>
      <RecordFilterBar
        options={props.options}
        filter={filter()}
        onChange={(patch) => {
          setFilter((current) => ({
            ...current,
            ...patch,
          }));
          setLimit(PAGE_SIZE);
        }}
      />

      <DataGrid
        ariaLabel="Atribución por RUC y mes"
        columns={columns()}
        emptyState="No hay ventas para los filtros actuales."
        loadMore={{
          hasMore: rows().length >= limit(),
          loading:
            cohortRows.state === "pending" || cohortRows.state === "refreshing",
          onLoadMore: () => {
            setLimit((current) => current + PAGE_SIZE);
          },
        }}
        source={{
          status: cohortRows.state === "errored" ? "error" : "ready",
          rows: rows(),
        }}
      />
    </div>
  );
}
