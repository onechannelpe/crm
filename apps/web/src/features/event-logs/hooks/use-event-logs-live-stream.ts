import { createEffect, createSignal, onCleanup, type Accessor } from "solid-js";

import {
  isEventLogTable,
  type EventLogRecord,
  type EventLogTable,
} from "~/contracts/event-logs/event-log";
import { buildRealtimeSubscriptionMessage } from "~/lib/realtime/ws-protocol";

const WS_RECONNECT_BASE_MS = 1_000;
const WS_RECONNECT_MAX_MS = 15_000;
const RECONNECT_JITTER_MS = 300;
const MAX_LIVE_RECORDS = 200;

function websocketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/audit/event-logs/ws`;
}

function withJitter(ms: number): number {
  return ms + Math.floor(Math.random() * (RECONNECT_JITTER_MS + 1));
}

function parseIncoming(raw: string): EventLogRecord | null {
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
  const [liveRecords, setLiveRecords] = createSignal<EventLogRecord[]>([]);

  createEffect(() => {
    const table = options.table();
    const enabled = options.enabled();

    // A table switch or a disable clears the live buffer so stale rows from the
    // previous view never linger.
    setLiveRecords([]);

    if (!enabled || typeof window === "undefined") return;

    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let attempt = 0;
    let disposed = false;

    const topic = `event-logs:${table}`;

    const connect = () => {
      if (disposed) return;
      socket = new WebSocket(websocketUrl());

      socket.addEventListener("open", () => {
        attempt = 0;
        socket?.send(
          buildRealtimeSubscriptionMessage({ type: "subscribe", topic }),
        );
      });

      socket.addEventListener("message", (event) => {
        const record = parseIncoming(String(event.data));
        if (!record || record.table !== table) return;
        setLiveRecords((previous) =>
          [record, ...previous].slice(0, MAX_LIVE_RECORDS),
        );
      });

      const scheduleReconnect = () => {
        if (disposed || reconnectTimer !== null) return;
        attempt += 1;
        const delay = withJitter(
          Math.min(
            WS_RECONNECT_BASE_MS * 2 ** (attempt - 1),
            WS_RECONNECT_MAX_MS,
          ),
        );
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, delay);
      };

      socket.addEventListener("close", scheduleReconnect);
      socket.addEventListener("error", scheduleReconnect);
    };

    connect();

    onCleanup(() => {
      disposed = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      try {
        socket?.close();
      } catch {
        // A torn-down browser socket must not block cleanup.
      }
    });
  });

  return liveRecords;
}
