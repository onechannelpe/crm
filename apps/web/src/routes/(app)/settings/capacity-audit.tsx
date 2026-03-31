import { createAsync } from "@solidjs/router";
import { createMemo } from "solid-js";

import Activity from "~/components/icons/activity";
import CalendarDays from "~/components/icons/calendar-days";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import UserRound from "~/components/icons/user-round";
import { AppPage } from "~/components/layout/page";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridColumn } from "~/features/data-grid/model/types";
import { useSidePanelRowOpen } from "~/features/side-panel/hooks/use-side-panel-row-open";
import { createDataGridDetailSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import { capacityAuditEventsQuery } from "~/lib/queries/capacity";

type CapacityAuditEvents = Awaited<ReturnType<typeof capacityAuditEventsQuery>>;
type CapacityAuditChange = CapacityAuditEvents[number]["changes"];
type CapacityAuditRow = CapacityAuditEvents[number] & { id: number };

const EMPTY_EVENTS: CapacityAuditEvents = [];
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
    key: "action",
    label: "Action",
    icon: Activity,
    minWidth: 220,
    grow: true,
    renderCell: (event) => event.action,
  },
  {
    key: "userId",
    label: "Actor",
    icon: UserRound,
    width: 120,
    renderCell: (event) => String(event.userId),
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
    renderCell: (event) => formatChanges(event.changes),
  },
] satisfies ReadonlyArray<DataGridColumn<CapacityAuditRow>>;

function formatTime(value: number): string {
  return new Date(value).toLocaleString();
}

function formatChanges(value: CapacityAuditChange): string {
  if (value == null) return "-";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify(value);
  }
}

export default function CapacityAuditPage() {
  const events = createAsync(() => capacityAuditEventsQuery(120));

  const rows = createMemo<CapacityAuditRow[]>(() =>
    (events() ?? EMPTY_EVENTS).map((event, index) => ({
      ...event,
      id: index + 1,
    })),
  );
  const isLoading = () => events() === undefined;

  const rowOpen = useSidePanelRowOpen<CapacityAuditRow>((event) =>
    createDataGridDetailSidePanelPage({
      title: event.action,
      subtitle: `${event.entityType}:${event.entityId}`,
      items: [
        { label: "Time", value: formatTime(event.createdAt) },
        { label: "Actor", value: String(event.userId) },
        { label: "Entity", value: `${event.entityType}:${event.entityId}` },
        { label: "Changes", value: formatChanges(event.changes) },
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
          isLoading={isLoading()}
          rowOpen={rowOpen}
          rows={rows()}
        />
      </div>
    </AppPage>
  );
}
