import { createPgTopicBridge } from "~/server/realtime/core/bridge";
import { TopicHub } from "~/server/realtime/core/topic-hub";

import {
  EVENT_LOGS_STREAM_CHANNEL,
  eventLogTopic,
  parseEventLogStreamPayload,
} from "./stream-contract";

const eventLogsTopicHub = new TopicHub();

const eventLogsBridge = createPgTopicBridge({
  name: "event-logs",
  channel: EVENT_LOGS_STREAM_CHANNEL,
  hub: eventLogsTopicHub,
  parseEvent: parseEventLogStreamPayload,
  topicForEvent: (record) => eventLogTopic(record.table),
  serializeEvent: (record) => JSON.stringify(record),
});

export async function ensureEventLogsRealtimeBridge(): Promise<void> {
  await eventLogsBridge.start();
}

export function getEventLogsTopicHub(): TopicHub {
  return eventLogsTopicHub;
}
