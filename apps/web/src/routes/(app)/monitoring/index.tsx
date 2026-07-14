import { revalidate } from "@solidjs/router";
import { Show, createMemo, createResource, createSignal } from "solid-js";

import { WindowSelect } from "~/components/features/audit/window-select";
import Activity from "~/components/icons/activity";
import CircleAlert from "~/components/icons/circle-alert";
import CircleCheckBig from "~/components/icons/circle-check-big";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Select } from "~/components/ui/input/select";
import { FilterBar } from "~/components/ui/layout/filter-bar";
import type { ObservabilitySnapshot } from "~/contracts/observability/snapshot";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { useSidePanelRowOpen } from "~/features/side-panel/hooks/use-side-panel-row-open";
import { createDataGridDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import { observabilitySnapshotQuery } from "~/lib/queries/audit";

import styles from "./monitoring-page.module.css";

type MonitoringStatus = "all" | "ok" | "error";
type MonitoringRow = ObservabilitySnapshot["summary"][number] & { id: string };

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

  const queryParams = createMemo(() => ({
    windowMinutes: windowMinutes(),
    status: status() === "all" ? undefined : status(),
    limit: 80,
  }));
  const [snapshot] = createResource(queryParams, (params) =>
    observabilitySnapshotQuery({
      windowMinutes: params.windowMinutes,
      status: params.status,
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

  const rows = createMemo<MonitoringRow[]>(() =>
    (latestSnapshot()?.summary ?? []).map((row, index) =>
      Object.assign({}, row, {
        id: `monitoring:${row.actionName}:${index}`,
      }),
    ),
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
        <div class={styles.filter}>
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
        <Show when={isRefreshing() && !isInitialLoading()}>
          <span class={styles.refreshing}>Actualizando...</span>
        </Show>
      </FilterBar>

      <DataGrid
        ariaLabel="Monitoreo"
        columns={MONITORING_COLUMNS}
        emptyState="No hay métricas disponibles para la ventana actual."
        onRowOpen={rowOpen}
        rowOpenIndicator="panel"
        source={{
          status: sourceStatus(),
          rows: rows(),
        }}
      />
    </AppPage>
  );
}
