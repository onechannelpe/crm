import { createMemo, type Accessor } from "solid-js";

import {
  parseEventLogRecordText,
  type EventLogRecord,
  type EventLogTable,
} from "~/contracts/event-logs/event-log";
import { useEventSourceRecords } from "~/lib/realtime/use-event-source-records";

const MAX_LIVE_RECORDS = 200;

export function useEventLogsLiveStream(options: {
  table: Accessor<EventLogTable>;
  enabled: Accessor<boolean>;
}): Accessor<EventLogRecord[]> {
  const url = createMemo(() =>
    options.enabled()
      ? `/api/event-logs/stream?table=${options.table()}`
      : null,
  );
  return useEventSourceRecords(url, parseEventLogRecordText, {
    limit: MAX_LIVE_RECORDS,
  });
}
