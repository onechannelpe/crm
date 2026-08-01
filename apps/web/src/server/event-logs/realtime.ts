import {
  decodeEventLogCursor,
  encodeEventLogCursor,
  isEventLogTable,
  type EventLogRecord,
} from "~/contracts/event-logs/event-log";
import {
  REALTIME_CHANNELS,
  type RealtimeMessage,
} from "~/contracts/realtime/channel";
import { hasPermission } from "~/domain/auth/access/rbac";
import { application } from "~/server/platform/composition/application";
import { defineRealtimeChannel } from "~/server/realtime/channel";

import {
  EVENT_LOGS_STREAM_CHANNEL,
  parseEventLogStreamPayload,
} from "./stream-contract";

const REPLAY_LIMIT = 200;

function recordCursor(record: EventLogRecord): string {
  return encodeEventLogCursor({
    timestamp: record.timestamp,
    id: record.id,
  });
}

function toMessage(record: EventLogRecord): RealtimeMessage {
  return {
    id: recordCursor(record),
    data: JSON.stringify(record),
  };
}

export const eventLogsChannel = defineRealtimeChannel({
  name: REALTIME_CHANNELS.eventLogs,
  pgChannel: EVENT_LOGS_STREAM_CHANNEL,

  parseId: (raw) => (isEventLogTable(raw) ? raw : null),

  open: async (session, table, cursor) => {
    if (!hasPermission(session.role, "audit:read")) {
      return null;
    }

    const decoded = cursor === null ? null : decodeEventLogCursor(cursor);

    // The initial page comes from the regular query; only reconnect gaps replay.
    if (!decoded) {
      return [];
    }

    const missed = await application.eventLogs.replayAfter(
      table,
      decoded,
      REPLAY_LIMIT,
    );

    return missed.map(toMessage);
  },

  topicIdOfPayload: (payload) =>
    parseEventLogStreamPayload(payload)?.table ?? null,

  cursorOf: (payload) => {
    const record = parseEventLogStreamPayload(payload);

    return record ? recordCursor(record) : undefined;
  },
});
