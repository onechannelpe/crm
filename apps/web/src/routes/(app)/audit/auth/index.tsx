import { createAsync, revalidate } from "@solidjs/router";
import { createMemo, createSignal } from "solid-js";

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
import { DataGrid, type DataGridColumn } from "~/features/data-grid";
import { useSidePanelRowOpen } from "~/features/side-panel/hooks/use-side-panel-row-open";
import { createDataGridDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import { authFunnelSnapshotQuery } from "~/lib/queries/audit";
import { formatDateTime } from "~/lib/utils";

type BadgeVariant = "success" | "destructive" | "outline";
type AuditAuthRow = Awaited<
  ReturnType<typeof authFunnelSnapshotQuery>
>["recent"][number] & { id: number };

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

  const snapshot = createAsync(
    () =>
      authFunnelSnapshotQuery({
        windowMinutes: windowMinutes(),
        limit: 80,
      }),
    { initialValue: { windowMinutes: 60, summary: [], recent: [] } },
  );

  const rows = createMemo<AuditAuthRow[]>(() =>
    snapshot().recent.map((row, index) => ({
      ...row,
      id: index + 1,
    })),
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
        rows={rows()}
      />
    </AppPage>
  );
}
