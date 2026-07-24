import { createAsync, useAction, useParams } from "@solidjs/router";
import { createMemo, ErrorBoundary, Suspense } from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state/empty";
import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import ChartColumn from "~/components/icons/chart-column";
import CircleAlert from "~/components/icons/circle-alert";
import User from "~/components/icons/user";
import { Present } from "~/components/ui/control-flow/present";
import { Badge } from "~/components/ui/display/badge";
import { InlineOptionsEditor } from "~/components/ui/input/inline-field-editor";
import {
  ATTRIBUTION_CONFIDENCE_LABEL,
  QUALITY_ISSUE_COPY,
} from "~/contracts/merchant-stats/quality-copy";
import type { QualityRow } from "~/contracts/merchant-stats/views";
import { isQualityIssue } from "~/contracts/merchant-stats/vocabulary";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridSource } from "~/features/data-grid/model/source";
import type { DataGridColumn } from "~/features/data-grid/model/types";

import { adjustMonthCreditMutation } from "../data/mutations";
import { merchantFilterOptionsQuery, qualityRowsQuery } from "../data/queries";
import { formatMonth, formatSoles } from "../format";
import {
  GPV_GRID_PAGE_SIZE,
  useDashboardGrid,
} from "../grids/use-dashboard-grid";

import styles from "./quality-page.module.css";

const UNASSIGNED = "Sin asignar";

export function QualityPage() {
  const params = useParams<{ issue: string }>();
  const issue = createMemo(() =>
    isQualityIssue(params.issue) ? params.issue : null,
  );

  const options = createAsync(() => merchantFilterOptionsQuery());
  const sellers = () => options()?.sellers ?? [];
  const adjustCredit = useAction(adjustMonthCreditMutation);

  const grid = useDashboardGrid<QualityRow>({
    pageSize: GPV_GRID_PAGE_SIZE,
    resetKey: () => issue() ?? "invalid",
    load: (page) => {
      const current = issue();
      return current
        ? qualityRowsQuery({ issue: current, page })
        : Promise.resolve({ publicationId: null, rows: [] });
    },
  });

  const columns: ReadonlyArray<DataGridColumn<QualityRow>> = [
    {
      key: "ruc",
      label: "Comercio",
      icon: Building2,
      minWidth: 180,
      maxWidth: 260,
      sticky: true,
      renderCell: (row) => row.organizationName ?? row.tradeName ?? row.ruc,
    },
    {
      key: "month",
      label: "Mes",
      icon: CalendarDays,
      width: 120,
      renderCell: (row) => formatMonth(row.month),
    },
    {
      key: "gpvAtStake",
      label: "GPV en juego",
      icon: ChartColumn,
      width: 140,
      renderCell: (row) => formatSoles(row.gpvAtStake),
    },
    {
      key: "seller",
      label: "Vendedor",
      icon: User,
      width: 200,
      renderCell: (row) => row.sellerName ?? UNASSIGNED,
      edit: {
        ariaLabel: "Resolver vendedor",
        renderEditor: (editor) => (
          <InlineOptionsEditor
            ariaLabel="Vendedor real"
            options={[UNASSIGNED, ...sellers().map((seller) => seller.name)]}
            selected={editor.row.sellerName ?? UNASSIGNED}
            onSubmit={(name) => {
              const seller = sellers().find(
                (candidate) => candidate.name === name,
              );
              return adjustCredit({
                ruc: editor.row.ruc,
                month: editor.row.month,
                sellerUserId: seller?.userId ?? null,
                reason: "Resolución de incidencia de atribución",
              }).then(() => undefined);
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
      key: "detail",
      label: "Motivo",
      icon: CircleAlert,
      minWidth: 320,
      grow: true,
      renderCell: (row) => (
        <span class={styles.detail}>
          <Badge variant="warning">
            {ATTRIBUTION_CONFIDENCE_LABEL[row.confidence]}
          </Badge>
          <span>{row.detail}</span>
        </span>
      ),
    },
  ];

  const renderGrid = (label: string, source: DataGridSource<QualityRow>) => (
    <DataGrid
      ariaLabel={label}
      columns={columns}
      emptyState="No hay comercios pendientes en esta cola."
      loadMore={{
        hasMore: grid.hasMore(),
        loading: grid.loading(),
        onLoadMore: grid.onLoadMore,
      }}
      rowId={(row) => `${row.ruc}:${row.month}`}
      source={source}
    />
  );

  return (
    <div class={styles.page}>
      <Present
        when={issue()}
        fallback={
          <EmptyState
            title="Esta cola no existe"
            description="Revisa el enlace o vuelve al panel de GPV."
          />
        }
      >
        {(current) => {
          const label = () => QUALITY_ISSUE_COPY[current()].label;
          return (
            <>
              <h1 class={styles.title}>{label()}</h1>
              <ErrorBoundary
                fallback={renderGrid(label(), { status: "error", rows: [] })}
              >
                <Suspense
                  fallback={renderGrid(label(), {
                    status: "pending",
                    rows: [],
                  })}
                >
                  {renderGrid(label(), {
                    status: "ready",
                    rows: grid.rows(),
                  })}
                </Suspense>
              </ErrorBoundary>
            </>
          );
        }}
      </Present>
    </div>
  );
}
