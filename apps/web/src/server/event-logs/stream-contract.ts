import {
  parseEventLogRecordText,
  type EventLogRecord,
} from "~/contracts/event-logs/event-log";
import { defineTopic } from "~/contracts/realtime/topic";

export const EVENT_LOGS_STREAM_CHANNEL = "event_logs_stream";
const MAX_STREAM_PAYLOAD_BYTES = 7_500;

export const eventLogTopic = defineTopic("event-logs");

export function serializeEventLogStreamPayload(
  record: EventLogRecord,
): string | null {
  const text = JSON.stringify(record);
  if (new TextEncoder().encode(text).byteLength > MAX_STREAM_PAYLOAD_BYTES) {
    return null;
  }
  return text;
}

export function parseEventLogStreamPayload(raw: string): EventLogRecord | null {
  const result = parseEventLogRecordText(raw);
  return result.ok ? result.value : null;
}
