import { revalidate } from "@solidjs/router";
import { Show, createMemo, createResource, createSignal } from "solid-js";

import {
  WINDOW_OPTIONS_EXTENDED,
  WindowSelect,
} from "~/components/features/audit/window-select";
import Activity from "~/components/icons/activity";
import CalendarDays from "~/components/icons/calendar-days";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import UserRound from "~/components/icons/user-round";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Checkbox } from "~/components/ui/input/checkbox";
import { Input } from "~/components/ui/input/input";
import { FilterBar } from "~/components/ui/layout/filter-bar";
import type { AuditReaderSnapshot } from "~/contracts/audit-reader/snapshot";
import { summarizeFieldChanges } from "~/contracts/events";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { useSidePanelRowOpen } from "~/features/side-panel/hooks/use-side-panel-row-open";
import { createDataGridDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import { auditReaderSnapshotQuery } from "~/lib/queries/audit";
import { formatDateTime } from "~/lib/utils";

type AuditLogEvent = AuditReaderSnapshot["events"][number];
type AuditLogGridRow = AuditLogEvent & { id: string };

function formatEventDetail(row: AuditLogGridRow): string {
  if (row.changes.length > 0) return summarizeFieldChanges(row.changes);
  return row.payload ?? "—";
}

function formatActor(actorUserId: number | null): string {
  return actorUserId === null ? "Sistema" : `#${actorUserId}`;
}

const AUDIT_LOG_COLUMNS = [
  {
    key: "occurredAt",
    label: "Hora",
    icon: CalendarDays,
    width: 180,
    sticky: true,
    renderCell: (row) => formatDateTime(row.occurredAt),
  },
  {
    key: "type",
    label: "Acción",
    icon: Activity,
    minWidth: 220,
    grow: true,
    renderCell: (row) => row.type,
  },
  {
    key: "entity",
    label: "Entidad",
    icon: CircleQuestionMark,
    width: 180,
    renderCell: (row) => `${row.entityType}#${row.entityId}`,
  },
  {
    key: "actor",
    label: "Actor",
    icon: UserRound,
    width: 120,
    renderCell: (row) => formatActor(row.actorUserId),
  },
  {
    key: "changes",
    label: "Cambios",
    icon: CircleQuestionMark,
    minWidth: 280,
    maxWidth: 520,
    grow: true,
    renderCell: (row) => formatEventDetail(row),
  },
] satisfies ReadonlyArray<DataGridColumn<AuditLogGridRow>>;

function parseActorUserId(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

export default function AuditLogPage() {
  const [windowMinutes, setWindowMinutes] = createSignal(1440);
  const [onlyHighRisk, setOnlyHighRisk] = createSignal(true);
  const [actionFilter, setActionFilter] = createSignal("");
  const [entityTypeFilter, setEntityTypeFilter] = createSignal("");
  const [actorUserIdFilter, setActorUserIdFilter] = createSignal("");

  const queryParams = createMemo(() => ({
    windowMinutes: windowMinutes(),
    limit: 80,
    onlyHighRisk: onlyHighRisk(),
    action: actionFilter().trim() || undefined,
    entityType: entityTypeFilter().trim() || undefined,
    actorUserId: parseActorUserId(actorUserIdFilter()),
  }));
  const [snapshot] = createResource(queryParams, (params) =>
    auditReaderSnapshotQuery({
      windowMinutes: params.windowMinutes,
      limit: params.limit,
      onlyHighRisk: params.onlyHighRisk,
      action: params.action,
      entityType: params.entityType,
      actorUserId: params.actorUserId,
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

  const rows = createMemo<AuditLogGridRow[]>(() =>
    (latestSnapshot()?.events ?? []).map((event, index) =>
      Object.assign({}, event, {
        id: `audit:${event.occurredAt}:${index}`,
      }),
    ),
  );

  const rowOpen = useSidePanelRowOpen<AuditLogGridRow>((row) =>
    createDataGridDetailSidePanelPage({
      title: row.type,
      subtitle: `${row.entityType}#${row.entityId}`,
      items: [
        { label: "Hora", value: formatDateTime(row.occurredAt) },
        { label: "Entidad", value: `${row.entityType}#${row.entityId}` },
        { label: "Actor", value: formatActor(row.actorUserId) },
        { label: "Cambios", value: formatEventDetail(row) },
      ],
    }),
  );

  return (
    <AppPage>
      <FilterBar>
        <WindowSelect
          value={windowMinutes()}
          onInput={setWindowMinutes}
          options={WINDOW_OPTIONS_EXTENDED}
        />
        <div style={{ width: "13rem" }}>
          <Input
            label="Acción"
            value={actionFilter()}
            onInput={(e) => setActionFilter(e.currentTarget.value)}
            placeholder="lead_refill_granted"
          />
        </div>
        <div style={{ width: "11rem" }}>
          <Input
            label="Entidad"
            value={entityTypeFilter()}
            onInput={(e) => setEntityTypeFilter(e.currentTarget.value)}
            placeholder="lead_policy"
          />
        </div>
        <div style={{ width: "7rem" }}>
          <Input
            label="Actor #"
            value={actorUserIdFilter()}
            onInput={(e) => setActorUserIdFilter(e.currentTarget.value)}
            placeholder="5"
          />
        </div>
        <Checkbox
          label="Solo riesgo alto"
          checked={onlyHighRisk()}
          onInput={(e) => setOnlyHighRisk(e.currentTarget.checked)}
        />
        <Button
          onClick={() => {
            void revalidate(auditReaderSnapshotQuery.key);
          }}
        >
          Recargar
        </Button>
        <Show when={isRefreshing() && !isInitialLoading()}>
          <span class="text-xs text-muted-foreground">Actualizando...</span>
        </Show>
      </FilterBar>

      <DataGrid
        ariaLabel="Auditoría"
        columns={[...AUDIT_LOG_COLUMNS]}
        emptyState={
          <p class="px-3 py-4 text-sm text-muted-foreground">
            No hay eventos de auditoría para los filtros actuales.
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
