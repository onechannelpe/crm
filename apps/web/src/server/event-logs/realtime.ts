import type { EventLogRecord } from "~/contracts/event-logs/event-log";
import { createTopicRealtimeChannel } from "~/server/realtime/topic-realtime-channel";

import {
  EVENT_LOGS_STREAM_CHANNEL,
  eventLogTopic,
  parseEventLogStreamPayload,
} from "./stream-contract";

export const eventLogsRealtime = createTopicRealtimeChannel<EventLogRecord>({
  name: "event-logs",
  channel: EVENT_LOGS_STREAM_CHANNEL,
  parseEvent: parseEventLogStreamPayload,
  topicForEvent: (record) => eventLogTopic.of(record.table),
});
