import { createMemo, type Accessor } from "solid-js";

import {
  isEventLogTable,
  type EventLogRecord,
  type EventLogTable,
} from "~/contracts/event-logs/event-log";
import { useEventSourceRecords } from "~/lib/realtime/use-event-source-records";

const MAX_LIVE_RECORDS = 200;

function parseEventLogRecord(raw: string): EventLogRecord | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const candidate = parsed as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.timestamp !== "number" ||
    typeof candidate.table !== "string" ||
    !isEventLogTable(candidate.table)
  ) {
    return null;
  }
  return parsed as EventLogRecord;
}

export function useEventLogsLiveStream(options: {
  table: Accessor<EventLogTable>;
  enabled: Accessor<boolean>;
}): Accessor<EventLogRecord[]> {
  const url = createMemo(() =>
    options.enabled()
      ? `/api/event-logs/stream?table=${options.table()}`
      : null,
  );

  return useEventSourceRecords(url, parseEventLogRecord, {
    limit: MAX_LIVE_RECORDS,
  });
}
