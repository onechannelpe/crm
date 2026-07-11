import {
  parseEventLogRecordText,
  type EventLogRecord,
  type EventLogTable,
} from "~/contracts/event-logs/event-log";

export const EVENT_LOGS_STREAM_CHANNEL = "event_logs_stream";
const MAX_STREAM_PAYLOAD_BYTES = 7_500;
const TOPIC_PREFIX = "event-logs:";

export function eventLogTopic(table: EventLogTable): string {
  return `${TOPIC_PREFIX}${table}`;
}

export function serializeEventLogStreamPayload(
  record: EventLogRecord,
): string | null {
  const text = JSON.stringify(record);
  if (new TextEncoder().encode(text).byteLength > MAX_STREAM_PAYLOAD_BYTES) {
    return null;
  }
  return text;
}

export const parseEventLogStreamPayload = parseEventLogRecordText;
