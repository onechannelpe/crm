import { revalidate } from "@solidjs/router";
import { createMemo, createResource, createSignal, Show } from "solid-js";

import {
  resolveAttribution,
  setMerchantTarget,
} from "~/actions/dashboards/attribution";
import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import ChartColumn from "~/components/icons/chart-column";
import User from "~/components/icons/user";
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

const PAGE = 60;
const UNASSIGNED = "Sin asignar";

type Row = CohortSaleRow & { id: string };

// Attribution edits move the numbers every other surface reads and shift the
// seller option list, so the whole dashboard is revalidated rather than just
// this grid.
async function commit(): Promise<void> {
  await Promise.all([
    revalidate(cohortRowsQuery.key),
    revalidate(attainmentQuery.key),
    revalidate(merchantFilterOptionsQuery.key),
    revalidate(qualitySummaryQuery.key),
  ]);
}

// The attribution surface, at the grain credit is decided: RUC x month. Editing
// here is a correction of one month, not a rewrite of the merchant's history.
export function AttributionGrid(props: { options: FilterOptions }) {
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
    // The grid keys on `id`, which the read contract has no business
    // carrying. These rows are the cached query result, so a copy is the
    // only correct way to add it.
    // eslint-disable-next-line oxc/no-map-spread
    (page.latest ?? []).map((row) => ({ ...row, id: row.saleId })),
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
              await commit();
            }}
            onClose={editor.close}
          />
        ),
      },
    },
    {
      // Culqi's usuario, shown next to the real seller on purpose: it is the
      // best hint available when deciding an unattributed row, and seeing the
      // two disagree is the point. Never a substitute for the verdict.
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
      // The projection is per merchant, not per month: "este RUC debería rondar
      // los 60k". Editing writes a version effective from this row's month, so
      // earlier months keep the number they were measured against.
      key: "projected",
      label: "Proyectado",
      icon: ChartColumn,
      width: 170,
      renderCell: (row) => (
        <Show
          when={row.projectedGpv != null}
          fallback={<Badge variant="warning">Sin proyectado</Badge>}
        >
          {formatSoles(row.projectedGpv ?? 0)}
        </Show>
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
              await setMerchantTarget({
                ruc: editor.row.ruc,
                effectiveFrom: editor.row.saleMonth,
                projectedGpv: trimmed === "" ? null : Number(trimmed),
              });
              await commit();
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
          setFilter((current) => ({ ...current, ...patch }));
          setLimit(PAGE);
        }}
      />
      <DataGrid
        ariaLabel="Atribución por RUC y mes"
        columns={columns()}
        emptyState="No hay ventas para los filtros actuales."
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
