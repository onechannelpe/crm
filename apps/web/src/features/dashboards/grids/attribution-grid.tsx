import { createAsync } from "@solidjs/router";
import { ErrorBoundary, Suspense } from "solid-js";

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
import type { CohortSaleRow } from "~/contracts/merchant-stats/views";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridSource } from "~/features/data-grid/model/source";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import {
  cohortRowsQuery,
  merchantFilterOptionsQuery,
} from "~/lib/queries/dashboards";

import { formatMonth, formatSoles } from "../format";
import { GpvFilterBar } from "../gpv-filter-bar";
import type { GpvView } from "../gpv-view";
import { revalidateGpvData } from "../revalidate";
import { GPV_GRID_PAGE_SIZE, useDashboardGrid } from "./use-dashboard-grid";

import styles from "./grid-surface.module.css";

const UNASSIGNED = "Sin asignar";

export function AttributionGrid(props: { view: GpvView }) {
  const options = createAsync(() => merchantFilterOptionsQuery());
  const sellers = () => options()?.sellers ?? [];

  const grid = useDashboardGrid<CohortSaleRow>({
    pageSize: GPV_GRID_PAGE_SIZE,
    resetOn: props.view.filter,
    load: (page) => cohortRowsQuery({ filter: props.view.filter(), page }),
  });

  const columns: ReadonlyArray<DataGridColumn<CohortSaleRow>> = [
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
            options={[UNASSIGNED, ...sellers().map((seller) => seller.name)]}
            selected={editor.row.sellerName ?? UNASSIGNED}
            onSubmit={async (name) => {
              const seller = sellers().find(
                (candidate) => candidate.name === name,
              );

              await resolveAttribution({
                ruc: editor.row.ruc,
                month: editor.row.saleMonth,
                sellerUserId: seller?.userId ?? null,
                branchId: null,
              });

              await revalidateGpvData();
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

              await revalidateGpvData();
            }}
            onClose={editor.close}
          />
        ),
      },
    },
  ];

  const renderGrid = (source: DataGridSource<CohortSaleRow>) => (
    <DataGrid
      ariaLabel="Atribución por RUC y mes"
      columns={columns}
      emptyState="No hay ventas para los filtros actuales."
      loadMore={{
        hasMore: grid.hasMore(),
        loading: grid.loading(),
        onLoadMore: grid.onLoadMore,
      }}
      rowId={(row) => row.saleId}
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
