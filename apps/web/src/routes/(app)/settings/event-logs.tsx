import { type RouteDefinition, useSearchParams } from "@solidjs/router";
import { createMemo } from "solid-js";

import type {
  EventLogFilters,
  EventLogTable,
} from "~/contracts/event-logs/event-log";
import { SettingsLogs } from "~/features/event-logs/components/settings-logs";
import { eventLogInputFromQuery } from "~/features/event-logs/model/event-log-location";
import { SettingsPageLayout } from "~/features/settings-shell/page/settings-page-layout";
import { eventLogsQuery } from "~/rpc/event-logs/event-logs.query";

export const route = {
  preload: ({ location }) => {
    void eventLogsQuery(eventLogInputFromQuery(location.query));
  },
} satisfies RouteDefinition;

export default function SettingsEventLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const input = createMemo(() => eventLogInputFromQuery(searchParams));

  function handleTableChange(table: EventLogTable) {
    setSearchParams({
      table,
      eventType: null,
      actorUserId: null,
      status: null,
      onlyHighRisk: null,
      start: null,
      end: null,
    });
  }

  function handleFiltersChange(filters: EventLogFilters | undefined) {
    setSearchParams({
      eventType: filters?.eventType ?? null,
      actorUserId: filters?.actorUserId ?? null,
      status: filters?.status ?? null,
      onlyHighRisk: filters?.onlyHighRisk ? "true" : null,
      start: filters?.dateRange?.start ?? null,
      end: filters?.dateRange?.end ?? null,
    });
  }

  return (
    <SettingsPageLayout>
      <SettingsLogs
        input={input}
        onTableChange={handleTableChange}
        onFiltersChange={handleFiltersChange}
      />
    </SettingsPageLayout>
  );
}
