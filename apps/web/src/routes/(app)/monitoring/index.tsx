import { createAsync, revalidate } from "@solidjs/router";
import { createMemo, createSignal } from "solid-js";

import { WindowSelect } from "~/components/features/audit/window-select";
import Activity from "~/components/icons/activity";
import CircleAlert from "~/components/icons/circle-alert";
import CircleCheckBig from "~/components/icons/circle-check-big";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Select } from "~/components/ui/input/select";
import { FilterBar } from "~/components/ui/layout/filter-bar";
import { DataGrid, type DataGridColumn } from "~/features/data-grid";
import { useSidePanelRowOpen } from "~/features/side-panel/hooks/use-side-panel-row-open";
import { createDataGridDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import { observabilitySnapshotQuery } from "~/lib/queries/audit";

type MonitoringStatus = "all" | "ok" | "error";
type MonitoringRow = Awaited<
  ReturnType<typeof observabilitySnapshotQuery>
>["summary"][number] & { id: number };

const MONITORING_COLUMNS = [
  {
    key: "actionName",
    label: "Acción",
    icon: Activity,
    minWidth: 240,
    grow: true,
    sticky: true,
    renderCell: (row) => row.actionName,
  },
  {
    key: "count",
    label: "Ejecuciones",
    icon: CircleCheckBig,
    width: 140,
    renderCell: (row) => row.count,
  },
  {
    key: "errorCount",
    label: "Errores",
    icon: CircleAlert,
    width: 120,
    renderCell: (row) => row.errorCount,
  },
  {
    key: "avgDurationMs",
    label: "Promedio (ms)",
    icon: CircleQuestionMark,
    width: 150,
    renderCell: (row) => Math.round(row.avgDurationMs),
  },
  {
    key: "maxDurationMs",
    label: "Máximo (ms)",
    icon: CircleQuestionMark,
    width: 140,
    renderCell: (row) => Math.round(row.maxDurationMs),
  },
] satisfies ReadonlyArray<DataGridColumn<MonitoringRow>>;

function parseStatus(value: string): MonitoringStatus {
  if (value === "ok" || value === "error") return value;
  return "all";
}

export default function MonitoringPage() {
  const [windowMinutes, setWindowMinutes] = createSignal(60);
  const [status, setStatus] = createSignal<MonitoringStatus>("all");

  const snapshot = createAsync(
    () =>
      observabilitySnapshotQuery({
        windowMinutes: windowMinutes(),
        status: status() === "all" ? undefined : status(),
        limit: 80,
      }),
    { initialValue: { windowMinutes: 60, summary: [], recent: [] } },
  );

  const rows = createMemo<MonitoringRow[]>(() =>
    snapshot().summary.map((row, index) => ({
      ...row,
      id: index + 1,
    })),
  );

  const rowOpen = useSidePanelRowOpen<MonitoringRow>((row) =>
    createDataGridDetailSidePanelPage({
      title: row.actionName,
      subtitle: `${row.errorCount} errores`,
      items: [
        { label: "Ejecuciones", value: String(row.count) },
        { label: "Errores", value: String(row.errorCount) },
        {
          label: "Promedio (ms)",
          value: String(Math.round(row.avgDurationMs)),
        },
        { label: "Máximo (ms)", value: String(Math.round(row.maxDurationMs)) },
      ],
    }),
  );

  return (
    <AppPage>
      <FilterBar>
        <WindowSelect value={windowMinutes()} onInput={setWindowMinutes} />
        <div style={{ width: "10rem" }}>
          <Select
            label="Estado"
            value={status()}
            onInput={(e) => setStatus(parseStatus(e.currentTarget.value))}
          >
            <option value="all">Todos</option>
            <option value="ok">OK</option>
            <option value="error">Errores</option>
          </Select>
        </div>
        <Button
          onClick={() => {
            void revalidate(observabilitySnapshotQuery.key);
          }}
        >
          Recargar
        </Button>
      </FilterBar>

      <DataGrid
        ariaLabel="Monitoreo"
        columns={[...MONITORING_COLUMNS]}
        emptyState={
          <p class="px-3 py-4 text-sm text-muted-foreground">
            No hay métricas disponibles para la ventana actual.
          </p>
        }
        rowOpen={rowOpen}
        rows={rows()}
      />
    </AppPage>
  );
}
