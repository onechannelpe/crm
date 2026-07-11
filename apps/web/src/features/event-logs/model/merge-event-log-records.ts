import type { EventLogRecord } from "~/contracts/event-logs/event-log";

export function mergeEventLogRecords(
  live: EventLogRecord[],
  snapshot: EventLogRecord[],
): EventLogRecord[] {
  const records = new Map<string, EventLogRecord>();
  for (const record of [...snapshot, ...live])
    records.set(`${record.table}:${record.id}`, record);
  return [...records.values()].sort(
    (left, right) =>
      right.timestamp - left.timestamp || right.id.localeCompare(left.id),
  );
}
