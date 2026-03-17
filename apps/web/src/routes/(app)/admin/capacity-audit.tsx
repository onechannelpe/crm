import { createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";

import { AppPage } from "~/components/layout/page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { capacityAuditEventsQuery } from "~/lib/queries/capacity";

type CapacityAuditEvents = Awaited<ReturnType<typeof capacityAuditEventsQuery>>;
type CapacityAuditChange = CapacityAuditEvents[number]["changes"];

const EMPTY_EVENTS: CapacityAuditEvents = [];

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
  const events = createAsync(() => capacityAuditEventsQuery(120), {
    initialValue: EMPTY_EVENTS,
  });

  return (
    <AppPage width="wide">
      <div class="space-y-6">
        <div>
          <h2 class="text-2xl font-semibold">Capacity audit</h2>
          <p class="text-sm text-muted-foreground">
            Recent search, lead, and capacity control events.
          </p>
        </div>

        <Show
          when={events().length > 0}
          fallback={
            <p class="text-sm text-muted-foreground">No audit events found.</p>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={events()}>
                {(event) => {
                  const changesText = formatChanges(event.changes);
                  return (
                    <TableRow>
                      <TableCell>{formatTime(event.createdAt)}</TableCell>
                      <TableCell>{event.action}</TableCell>
                      <TableCell>{event.userId}</TableCell>
                      <TableCell>
                        {event.entityType}:{event.entityId}
                      </TableCell>
                      <TableCell
                        class="max-w-[480px] truncate"
                        title={changesText}
                      >
                        {changesText}
                      </TableCell>
                    </TableRow>
                  );
                }}
              </For>
            </TableBody>
          </Table>
        </Show>
      </div>
    </AppPage>
  );
}
