import { revalidate } from "@solidjs/router";
import { Show, createMemo, createResource, createSignal } from "solid-js";

import { WindowSelect } from "~/components/features/audit/window-select";
import Activity from "~/components/icons/activity";
import CalendarDays from "~/components/icons/calendar-days";
import CircleCheckBig from "~/components/icons/circle-check-big";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import Lock from "~/components/icons/lock";
import { AppPage } from "~/components/layout/page";
import { Badge } from "~/components/ui/display/badge";
import { Button } from "~/components/ui/input/button";
import { FilterBar } from "~/components/ui/layout/filter-bar";
import type { AuthFunnelSnapshot } from "~/contracts/observability/auth-funnel";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { useSidePanelRowOpen } from "~/features/side-panel/hooks/use-side-panel-row-open";
import { createDataGridDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import { authFunnelSnapshotQuery } from "~/lib/queries/audit";
import { formatDateTime } from "~/lib/utils";

type BadgeVariant = "success" | "destructive" | "outline";
type AuditAuthRow = AuthFunnelSnapshot["recent"][number] & { id: string };

const AUDIT_AUTH_COLUMNS = [
  {
    key: "createdAt",
    label: "Hora",
    icon: CalendarDays,
    width: 180,
    sticky: true,
    renderCell: (row) => formatDateTime(row.createdAt),
  },
  {
    key: "eventName",
    label: "Evento",
    icon: Activity,
    minWidth: 220,
    grow: true,
    renderCell: (row) => row.eventName,
  },
  {
    key: "screen",
    label: "Pantalla",
    icon: CircleQuestionMark,
    width: 180,
    renderCell: (row) => row.screen ?? "-",
  },
  {
    key: "method",
    label: "Método",
    icon: Lock,
    width: 160,
    renderCell: (row) => row.method ?? "-",
  },
  {
    key: "outcome",
    label: "Resultado",
    icon: CircleCheckBig,
    width: 160,
    renderCell: (row) => (
      <Badge variant={outcomeBadgeVariant(row.outcome)}>{row.outcome}</Badge>
    ),
  },
] satisfies ReadonlyArray<DataGridColumn<AuditAuthRow>>;

function outcomeBadgeVariant(outcome: string): BadgeVariant {
  const normalizedOutcome = outcome.toLowerCase();
  if (
    normalizedOutcome.includes("success") ||
    normalizedOutcome.includes("ok")
  ) {
    return "success";
  }
  if (
    normalizedOutcome.includes("fail") ||
    normalizedOutcome.includes("error")
  ) {
    return "destructive";
  }
  return "outline";
}

export default function AuditAuthPage() {
  const [windowMinutes, setWindowMinutes] = createSignal(60);

  const queryParams = createMemo(() => ({
    windowMinutes: windowMinutes(),
    limit: 80,
  }));
  const [snapshot] = createResource(queryParams, (params) =>
    authFunnelSnapshotQuery({
      windowMinutes: params.windowMinutes,
      limit: params.limit,
    }),
  );
  const latestSnapshot = () => snapshot.latest ?? null;
  const isInitialLoading = () =>
    snapshot.state === "pending" && snapshot.latest === undefined;
  const isRefreshing = () => snapshot.state === "refreshing";
  const snapshotError = (): Error | null => {
    const error = snapshot.error;
    if (error instanceof Error) {
      return error;
    }
    if (error === undefined || error === null) {
      return null;
    }
    return new Error(String(error));
  };
  const sourceStatus = (): "pending" | "ready" | "error" => {
    if (snapshotError()) {
      return "error";
    }
    if (isInitialLoading()) {
      return "pending";
    }
    return "ready";
  };

  const rows = createMemo<AuditAuthRow[]>(() =>
    (latestSnapshot()?.recent ?? []).map((row, index) =>
      Object.assign({}, row, {
        id: `auth:${row.createdAt}:${index}`,
      }),
    ),
  );

  const rowOpen = useSidePanelRowOpen<AuditAuthRow>((row) =>
    createDataGridDetailSidePanelPage({
      title: row.eventName,
      subtitle: row.outcome,
      items: [
        { label: "Hora", value: formatDateTime(row.createdAt) },
        { label: "Pantalla", value: row.screen ?? "-" },
        { label: "Método", value: row.method ?? "-" },
        { label: "Resultado", value: row.outcome },
        { label: "Fuente", value: row.source },
        { label: "Ruta", value: row.routePath ?? "-" },
        { label: "Código", value: row.code ?? "-" },
      ],
    }),
  );

  return (
    <AppPage>
      <FilterBar>
        <WindowSelect value={windowMinutes()} onInput={setWindowMinutes} />
        <Button
          onClick={() => {
            void revalidate(authFunnelSnapshotQuery.key);
          }}
        >
          Recargar
        </Button>
        <Show when={isRefreshing() && !isInitialLoading()}>
          <span class="text-xs text-muted-foreground">Actualizando...</span>
        </Show>
      </FilterBar>

      <DataGrid
        ariaLabel="Auditoría de autenticación"
        columns={[...AUDIT_AUTH_COLUMNS]}
        emptyState={
          <p class="px-3 py-4 text-sm text-muted-foreground">
            No hay eventos recientes de autenticación.
          </p>
        }
        rowOpen={rowOpen}
        source={{
          status: sourceStatus(),
          rows: rows(),
          error: snapshotError() ?? undefined,
        }}
      />
    </AppPage>
  );
}
