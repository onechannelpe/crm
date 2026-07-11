import {
  isEventLogTable,
  type EventLogRecord,
  type EventLogTable,
} from "~/contracts/event-logs/event-log";

export const EVENT_LOGS_STREAM_CHANNEL = "event_logs_stream";
const MAX_STREAM_PAYLOAD_BYTES = 7500;
const TOPIC_PREFIX = "event-logs:";

export function eventLogTopic(table: EventLogTable): string {
  return `${TOPIC_PREFIX}${table}`;
}

export function parseEventLogTopic(topic: string): EventLogTable | null {
  if (!topic.startsWith(TOPIC_PREFIX)) return null;
  const table = topic.slice(TOPIC_PREFIX.length);
  return isEventLogTable(table) ? table : null;
}

export function serializeEventLogStreamPayload(
  record: EventLogRecord,
): string | null {
  const text = JSON.stringify(record);
  if (text.length > MAX_STREAM_PAYLOAD_BYTES) return null;
  return text;
}

function isRecordShape(value: unknown): value is EventLogRecord {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.event === "string" &&
    typeof candidate.timestamp === "number" &&
    typeof candidate.table === "string" &&
    isEventLogTable(candidate.table)
  );
}

export function parseEventLogStreamPayload(raw: string): EventLogRecord | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return isRecordShape(parsed) ? parsed : null;
}
