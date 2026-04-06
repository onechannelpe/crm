import { createAsync, revalidate } from "@solidjs/router";
import { createMemo, createSignal } from "solid-js";

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
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { useSidePanelRowOpen } from "~/features/side-panel/hooks/use-side-panel-row-open";
import { createDataGridDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import { auditReaderSnapshotQuery } from "~/lib/queries/audit";
import { formatDateTime } from "~/lib/utils";
import type { AuditReaderSnapshot } from "~/server/audit-reader/contracts";

type AuditLogEvent = AuditReaderSnapshot["events"][number];
type AuditLogGridRow = AuditLogEvent & { id: number };

const AUDIT_LOG_COLUMNS = [
  {
    key: "createdAt",
    label: "Hora",
    icon: CalendarDays,
    width: 180,
    sticky: true,
    renderCell: (row) => formatDateTime(row.createdAt),
  },
  {
    key: "action",
    label: "Acción",
    icon: Activity,
    minWidth: 220,
    grow: true,
    renderCell: (row) => row.action,
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
    renderCell: (row) => `#${row.userId}`,
  },
  {
    key: "changes",
    label: "Cambios",
    icon: CircleQuestionMark,
    minWidth: 280,
    maxWidth: 520,
    grow: true,
    renderCell: (row) => row.changes ?? "-",
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

  const snapshot = createAsync(() =>
    auditReaderSnapshotQuery({
      windowMinutes: windowMinutes(),
      limit: 80,
      onlyHighRisk: onlyHighRisk(),
      action: actionFilter().trim() || undefined,
      entityType: entityTypeFilter().trim() || undefined,
      actorUserId: parseActorUserId(actorUserIdFilter()),
    }),
  );

  const rows = createMemo<AuditLogGridRow[]>(() =>
    (snapshot()?.events ?? []).map((event, index) => ({
      ...event,
      id: index + 1,
    })),
  );
  const isLoading = () => snapshot() === undefined;

  const rowOpen = useSidePanelRowOpen<AuditLogGridRow>((row) =>
    createDataGridDetailSidePanelPage({
      title: row.action,
      subtitle: `${row.entityType}#${row.entityId}`,
      items: [
        { label: "Hora", value: formatDateTime(row.createdAt) },
        { label: "Entidad", value: `${row.entityType}#${row.entityId}` },
        { label: "Actor", value: `#${row.userId}` },
        { label: "Cambios", value: row.changes ?? "-" },
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
            placeholder="sales_record_confirmed"
          />
        </div>
        <div style={{ width: "11rem" }}>
          <Input
            label="Entidad"
            value={entityTypeFilter()}
            onInput={(e) => setEntityTypeFilter(e.currentTarget.value)}
            placeholder="sales_record"
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
          status: isLoading() ? "pending" : "ready",
          rows: rows(),
        }}
      />
    </AppPage>
  );
}
