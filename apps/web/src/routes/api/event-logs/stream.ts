import type { APIEvent } from "@solidjs/start/server";

import {
  decodeEventLogCursor,
  encodeEventLogCursor,
  isEventLogTable,
  type EventLogRecord,
} from "~/contracts/event-logs/event-log";
import { hasPermission } from "~/domain/auth/access/rbac";
import { eventLogsRealtime } from "~/server/event-logs/realtime";
import {
  eventLogTopic,
  parseEventLogStreamPayload,
} from "~/server/event-logs/stream-contract";
import { getSession } from "~/server/platform/action/session";
import { getEventLogsRuntime } from "~/server/platform/container/event-logs-runtime";
import { openTopicStream } from "~/server/realtime/sse-topic-stream";

const REPLAY_LIMIT = 200;

function recordCursor(record: EventLogRecord): string {
  return encodeEventLogCursor({
    timestamp: record.timestamp,
    id: record.id,
  });
}

export async function GET(
  event: Pick<APIEvent, "request" | "nativeEvent">,
): Promise<Response | BodyInit> {
  const table = new URL(event.request.url).searchParams.get("table");

  if (!table || !isEventLogTable(table)) {
    return new Response("Invalid table", { status: 400 });
  }

  const session = await getSession();

  if (
    !session ||
    session.sessionClass !== "app" ||
    !hasPermission(session.role, "audit:read")
  ) {
    return new Response(null, { status: 401 });
  }

  await eventLogsRealtime.ensure();

  const stream = await openTopicStream(
    event.nativeEvent,
    eventLogsRealtime.hub,
    eventLogTopic.of(table),
    {
      eventId: (raw) => {
        const record = parseEventLogStreamPayload(raw);

        return record ? recordCursor(record) : undefined;
      },
    },
  );

  const lastEventId = event.request.headers.get("last-event-id");
  const cursor = lastEventId ? decodeEventLogCursor(lastEventId) : null;

  if (cursor) {
    const missed = await getEventLogsRuntime().eventLogsService.replayAfter(
      table,
      cursor,
      REPLAY_LIMIT,
    );

    await stream.push(
      missed.map((record) => ({
        id: recordCursor(record),
        data: JSON.stringify(record),
      })),
    );
  }

  return stream.send();
}
