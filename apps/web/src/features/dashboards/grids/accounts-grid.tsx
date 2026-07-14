import { revalidate } from "@solidjs/router";
import { createMemo, createResource, createSignal } from "solid-js";

import { updateMerchantAccount } from "~/actions/dashboards/accounts";
import Building2 from "~/components/icons/building-2";
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
  merchantStatsOverviewQuery,
} from "~/lib/queries/dashboards";
import type {
  MerchantStatsFilterOptions,
  MerchantStatsFilters,
  MerchantAccountRow,
} from "~/server/merchant-stats/read/contracts";

import { formatInteger, formatSoles } from "../format";

const PAGE = 60;
const UNASSIGNED = "Sin asignar";

type Row = MerchantAccountRow & { id: string };

async function commit(): Promise<void> {
  await Promise.all([
    revalidate(accountRowsQuery.key),
    revalidate(merchantStatsOverviewQuery.key),
  ]);
}

export function AccountsGrid(props: {
  filters: MerchantStatsFilters & { missingEnrichment?: boolean };
  options: MerchantStatsFilterOptions;
}) {
  const [limit, setLimit] = createSignal(PAGE);

  const [page] = createResource(
    () => ({ filters: props.filters, limit: limit() }),
    (input) =>
      accountRowsQuery({
        filters: input.filters,
        page: { limit: input.limit, offset: 0 },
      }),
  );

  const rows = createMemo<Row[]>(() =>
    (page.latest ?? []).map((row) => ({ ...row, id: row.ruc })),
  );

  const sellerNames = () => [
    UNASSIGNED,
    ...props.options.sellers.map((s) => s.name),
  ];
  const branchNames = () => [
    UNASSIGNED,
    ...props.options.branches.map((b) => b.name),
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
              const seller = props.options.sellers.find((s) => s.name === name);
              await updateMerchantAccount({
                ruc: editor.row.ruc,
                field: "realSellerUserId",
                value: seller?.id ?? null,
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
                (b) => b.name === name,
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
      label: "Proyectado",
      icon: ChartColumn,
      width: 140,
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
      key: "latest",
      label: "GPV mes actual",
      icon: ChartColumn,
      width: 150,
      renderCell: (row) => formatSoles(row.latestMonthGpv),
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
    <DataGrid
      ariaLabel="Atribución por RUC"
      columns={columns()}
      emptyState={
        <p class="px-3 py-4 text-sm text-muted-foreground">
          No hay cuentas para los filtros actuales.
        </p>
      }
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
  );
}
