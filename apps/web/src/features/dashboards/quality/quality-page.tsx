import { createAsync, revalidate, useParams } from "@solidjs/router";
import { createMemo, createResource, createSignal } from "solid-js";

import { resolveAttribution } from "~/actions/dashboards/attribution";
import { EmptyState } from "~/components/feedback/empty-state/empty";
import Building2 from "~/components/icons/building-2";
import CalendarDays from "~/components/icons/calendar-days";
import ChartColumn from "~/components/icons/chart-column";
import CircleAlert from "~/components/icons/circle-alert";
import User from "~/components/icons/user";
import { AppPage, AppPageSection } from "~/components/layout/page";
import { Present } from "~/components/ui/control-flow/present";
import { Badge } from "~/components/ui/display/badge";
import { InlineOptionsEditor } from "~/components/ui/input/inline-field-editor";
import type { QualityRow } from "~/contracts/merchant-stats/views";
import {
  isQualityIssue,
  type QualityIssue,
} from "~/contracts/merchant-stats/vocabulary";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import {
  attainmentQuery,
  merchantFilterOptionsQuery,
  qualityRowsQuery,
  qualitySummaryQuery,
} from "~/lib/queries/dashboards";

import { formatMonth, formatSoles } from "../format";

import styles from "./quality-page.module.css";

const PAGE = 60;
const UNASSIGNED = "Sin asignar";

const TITLES: Record<QualityIssue, string> = {
  conflict: "Atribución en conflicto",
  late: "Registrado después de la venta",
  none: "Sin evidencia en el CRM",
  no_target: "Meses sin proyectado",
  serial_mismatch: "Series que no cuadran con entregas",
};

type Row = QualityRow & { id: string };

async function commit(): Promise<void> {
  await Promise.all([
    revalidate(qualityRowsQuery.key),
    revalidate(qualitySummaryQuery.key),
    revalidate(attainmentQuery.key),
    revalidate(merchantFilterOptionsQuery.key),
  ]);
}

export function QualityPage() {
  const params = useParams<{ issue: string }>();
  const issue = createMemo(() =>
    isQualityIssue(params.issue) ? params.issue : null,
  );

  const options = createAsync(() => merchantFilterOptionsQuery(), {
    initialValue: { branches: [], sellers: [], months: [], products: [] },
  });

  const [limit, setLimit] = createSignal(PAGE);

  const [page] = createResource(
    () => {
      const current = issue();
      return current ? { issue: current, limit: limit() } : null;
    },
    (input) =>
      qualityRowsQuery({
        issue: input.issue,
        page: { limit: input.limit, offset: 0 },
      }),
  );

  const rows = createMemo<Row[]>(() =>
    // eslint-disable-next-line oxc/no-map-spread
    (page.latest ?? []).map((row) => ({
      ...row,
      id: `${row.ruc}:${row.month}`,
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
            options={[
              UNASSIGNED,
              ...options().sellers.map((seller) => seller.name),
            ]}
            selected={editor.row.sellerName ?? UNASSIGNED}
            onSubmit={async (name) => {
              const seller = options().sellers.find(
                (candidate) => candidate.name === name,
              );
              await resolveAttribution({
                ruc: editor.row.ruc,
                month: editor.row.month,
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
          <Badge variant="warning">{row.confidence}</Badge>
          <span>{row.detail}</span>
        </span>
      ),
    },
  ]);

  return (
    <AppPage>
      <AppPageSection>
        <Present
          when={issue()}
          fallback={
            <EmptyState
              title="Esta cola no existe"
              description="Revisa el enlace o vuelve al panel de GPV."
            />
          }
        >
          {(current) => (
            <>
              <h1 class={styles.title}>{TITLES[current()]}</h1>
              <DataGrid
                ariaLabel={TITLES[current()]}
                columns={columns()}
                emptyState="No hay filas pendientes en esta cola."
                loadMore={{
                  hasMore: rows().length >= limit(),
                  loading:
                    page.state === "pending" || page.state === "refreshing",
                  onLoadMore: () => void setLimit((value) => value + PAGE),
                }}
                source={{
                  status: page.state === "errored" ? "error" : "ready",
                  rows: rows(),
                }}
              />
            </>
          )}
        </Present>
      </AppPageSection>
    </AppPage>
  );
}
