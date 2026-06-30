import { createAsync } from "@solidjs/router";
import { createMemo } from "solid-js";

import Activity from "~/components/icons/activity";
import CalendarDays from "~/components/icons/calendar-days";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import UserRound from "~/components/icons/user-round";
import { AppPage } from "~/components/layout/page";
import type { CapacityAuditEvent } from "~/contracts/capacity";
import { summarizeFieldChanges } from "~/contracts/events";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { useSidePanelRowOpen } from "~/features/side-panel/hooks/use-side-panel-row-open";
import { createDataGridDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import { capacityAuditEventsQuery } from "~/lib/queries/capacity";

type CapacityAuditGridRow = CapacityAuditEvent & { id: string };

const EMPTY_EVENTS: CapacityAuditEvent[] = [];
const CAPACITY_AUDIT_COLUMNS = [
  {
    key: "createdAt",
    label: "Time",
    icon: CalendarDays,
    width: 180,
    sticky: true,
    renderCell: (event) => formatTime(event.createdAt),
  },
  {
    key: "type",
    label: "Action",
    icon: Activity,
    minWidth: 220,
    grow: true,
    renderCell: (event) => event.type,
  },
  {
    key: "actor",
    label: "Actor",
    icon: UserRound,
    width: 120,
    renderCell: (event) => formatActor(event.actorUserId),
  },
  {
    key: "entity",
    label: "Entity",
    icon: CircleQuestionMark,
    width: 180,
    renderCell: (event) => `${event.entityType}:${event.entityId}`,
  },
  {
    key: "changes",
    label: "Changes",
    icon: CircleQuestionMark,
    minWidth: 280,
    maxWidth: 480,
    grow: true,
    renderCell: (event) => formatDetail(event),
  },
] satisfies ReadonlyArray<DataGridColumn<CapacityAuditGridRow>>;

function formatTime(value: number): string {
  return new Date(value).toLocaleString();
}

function formatActor(actorUserId: string | null): string {
  return actorUserId === null ? "System" : String(actorUserId);
}

function formatDetail(event: CapacityAuditEvent): string {
  if (event.changes.length > 0) return summarizeFieldChanges(event.changes);
  return event.payload ?? "-";
}

export default function CapacityAuditPage() {
  const events = createAsync(() => capacityAuditEventsQuery(120));

  const rows = createMemo<CapacityAuditGridRow[]>(() =>
    (events() ?? EMPTY_EVENTS).map((event) =>
      Object.assign({}, event, { id: `capacity-audit:${event.id}` }),
    ),
  );
  const isLoading = () => events() === undefined;

  const rowOpen = useSidePanelRowOpen<CapacityAuditGridRow>((event) =>
    createDataGridDetailSidePanelPage({
      title: event.type,
      subtitle: `${event.entityType}:${event.entityId}`,
      items: [
        { label: "Time", value: formatTime(event.createdAt) },
        { label: "Actor", value: formatActor(event.actorUserId) },
        { label: "Entity", value: `${event.entityType}:${event.entityId}` },
        { label: "Changes", value: formatDetail(event) },
      ],
    }),
  );

  return (
    <AppPage width="wide">
      <div class="space-y-6">
        <div>
          <h2 class="text-2xl font-semibold">Capacity audit</h2>
          <p class="text-sm text-muted-foreground">
            Recent search, lead, and capacity control events.
          </p>
        </div>

        <DataGrid
          ariaLabel="Capacity audit"
          columns={[...CAPACITY_AUDIT_COLUMNS]}
          emptyState={
            <p class="px-3 py-4 text-sm text-muted-foreground">
              No audit events found.
            </p>
          }
          rowOpen={rowOpen}
          source={{
            status: isLoading() ? "pending" : "ready",
            rows: rows(),
          }}
        />
      </div>
    </AppPage>
  );
}
