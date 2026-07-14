import { revalidate } from "@solidjs/router";
import { createMemo, createResource, createSignal } from "solid-js";

import { updateMerchantAccount } from "~/actions/dashboards/accounts";
import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import ChartColumn from "~/components/icons/chart-column";
import User from "~/components/icons/user";
import {
  InlineFieldEditor,
  InlineOptionsEditor,
} from "~/components/ui/input/inline-field-editor";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import {
  accountRowsQuery,
  merchantFilterOptionsQuery,
  merchantPerformanceQuery,
} from "~/lib/queries/dashboards";
import {
  parseSellerKey,
  type MerchantAccountRow,
  type MerchantStatsFilterOptions,
  type RecordFilters,
} from "~/server/merchant-stats/read/contracts";

import { formatInteger, formatMonth, formatSoles } from "../format";
import { RecordFilterBar } from "./record-filter-bar";

import styles from "./grid-surface.module.css";
import filterStyles from "./record-filter-bar.module.css";

const PAGE = 60;
const UNASSIGNED = "Sin asignar";

type Row = MerchantAccountRow & { id: string };

// Attribution edits move the numbers every other surface reads, so the whole
// dashboard is revalidated rather than just this grid. Options move too: naming
// a seller on a RUC is what promotes them out of label-only into the dropdown.
async function commit(): Promise<void> {
  await Promise.all([
    revalidate(accountRowsQuery.key),
    revalidate(merchantPerformanceQuery.key),
    revalidate(merchantFilterOptionsQuery.key),
  ]);
}

export function AccountsGrid(props: { options: MerchantStatsFilterOptions }) {
  const [filters, setFilters] = createSignal<RecordFilters>({});
  const [missingOnly, setMissingOnly] = createSignal(false);
  const [limit, setLimit] = createSignal(PAGE);

  const [page] = createResource(
    () => ({
      filters: { ...filters(), missingEnrichment: missingOnly() },
      limit: limit(),
    }),
    (input) =>
      accountRowsQuery({
        filters: input.filters,
        page: { limit: input.limit, offset: 0 },
      }),
  );

  const rows = createMemo<Row[]>(() =>
    (page.latest ?? []).map((row) => ({ ...row, id: row.ruc })),
  );

  // Only CRM users can be attributed: real_seller_user_id is a foreign key, so
  // the label-only sellers that the filter offers ("EMPRESA", unmatched names)
  // are not assignable here. Assigning is how a label becomes a real user.
  const assignableSellers = createMemo(() =>
    props.options.sellers.flatMap((seller) => {
      const parsed = parseSellerKey(seller.key);
      return parsed.kind === "user"
        ? [{ userId: parsed.userId, name: seller.name }]
        : [];
    }),
  );

  const sellerNames = () => [
    UNASSIGNED,
    ...assignableSellers().map((seller) => seller.name),
  ];
  const branchNames = () => [
    UNASSIGNED,
    ...props.options.branches.map((branch) => branch.name),
  ];

  const columns = createMemo<ReadonlyArray<DataGridColumn<Row>>>(() => [
    {
      key: "ruc",
      label: "RUC",
      icon: Building2,
      minWidth: 160,
      sticky: true,
      renderCell: (row) => row.organizationName ?? row.ruc,
    },
    {
      key: "seller",
      label: "Vendedor real",
      icon: User,
      width: 190,
      renderCell: (row) => row.realSellerName ?? UNASSIGNED,
      edit: {
        ariaLabel: "Editar vendedor",
        renderEditor: (editor) => (
          <InlineOptionsEditor
            ariaLabel="Vendedor real"
            options={sellerNames()}
            selected={editor.row.realSellerName ?? UNASSIGNED}
            onSubmit={async (name) => {
              const seller = assignableSellers().find(
                (candidate) => candidate.name === name,
              );
              await updateMerchantAccount({
                ruc: editor.row.ruc,
                field: "realSellerUserId",
                value: seller?.userId ?? null,
              });
              await commit();
            }}
            onClose={editor.close}
          />
        ),
      },
    },
    {
      key: "branch",
      label: "Zonal",
      icon: Building2,
      width: 150,
      renderCell: (row) => row.branchName ?? "—",
      edit: {
        ariaLabel: "Editar zonal",
        renderEditor: (editor) => (
          <InlineOptionsEditor
            ariaLabel="Zonal"
            options={branchNames()}
            selected={editor.row.branchName ?? UNASSIGNED}
            onSubmit={async (name) => {
              const branch = props.options.branches.find(
                (candidate) => candidate.name === name,
              );
              await updateMerchantAccount({
                ruc: editor.row.ruc,
                field: "branchId",
                value: branch?.id ?? null,
              });
              await commit();
            }}
            onClose={editor.close}
          />
        ),
      },
    },
    {
      key: "projected",
      label: "Proyectado mensual",
      icon: ChartColumn,
      width: 160,
      renderCell: (row) =>
        row.projectedGpv != null ? formatSoles(row.projectedGpv) : "—",
      edit: {
        ariaLabel: "Editar proyectado",
        renderEditor: (editor) => (
          <InlineFieldEditor
            ariaLabel="Proyectado"
            type="number"
            min="0"
            initialValue={editor.row.projectedGpv?.toString() ?? ""}
            onSubmit={async (value) => {
              const trimmed = value.trim();
              await updateMerchantAccount({
                ruc: editor.row.ruc,
                field: "projectedGpv",
                value: trimmed === "" ? null : Number(trimmed),
              });
              await commit();
            }}
            onClose={editor.close}
          />
        ),
      },
    },
    {
      key: "latestSaleMonth",
      label: "Última venta",
      icon: CalendarDays,
      width: 130,
      renderCell: (row) =>
        row.latestSaleMonth ? formatMonth(row.latestSaleMonth) : "—",
    },
    {
      key: "salesCount",
      label: "Dispositivos",
      icon: ChartColumn,
      width: 120,
      renderCell: (row) => formatInteger(row.salesCount),
    },
  ]);

  return (
    <div class={styles.surface}>
      <RecordFilterBar
        options={props.options}
        filters={filters()}
        onChange={(patch) => {
          setFilters((current) => ({ ...current, ...patch }));
          setLimit(PAGE);
        }}
      >
        <label class={filterStyles.toggle}>
          <input
            type="checkbox"
            checked={missingOnly()}
            onChange={(event) => {
              setMissingOnly(event.currentTarget.checked);
              setLimit(PAGE);
            }}
          />
          Solo faltantes
        </label>
      </RecordFilterBar>
      <DataGrid
        ariaLabel="Atribución por RUC"
        columns={columns()}
        emptyState="No hay cuentas para los filtros actuales."
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
