import {
  realtimeStreamUrl,
  type RealtimeChannelName,
  type RealtimeMessage,
} from "~/contracts/realtime/channel";

const EVENT_SOURCE_CLOSED = 2;

// EventSource does not retry after every failed HTTP response, so closed
// connections are reopened here with exponential backoff.
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

// Spread reconnections across time after a server restart.
function withJitter(delayMs: number): number {
  return delayMs * (0.5 + Math.random());
}

export type ConnectionState = "idle" | "connecting" | "live" | "offline";

export interface StreamMessageEvent {
  data: string;
  lastEventId: string;
}

export interface RealtimeStreamSource {
  readonly readyState: number;
  close: () => void;
  addEventListener: {
    (type: "open", listener: () => void): void;
    (type: "message", listener: (event: StreamMessageEvent) => void): void;
    (type: "error", listener: () => void): void;
  };
}

export interface ConnectionParams {
  channel: RealtimeChannelName;
  id: string;
  onMessage: (message: RealtimeMessage) => void;
  openEventSource: (url: string) => RealtimeStreamSource;
  setState: (state: ConnectionState) => void;
}

export function startConnection(params: ConnectionParams): () => void {
  let source: RealtimeStreamSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectDelayMs = RECONNECT_BASE_MS;
  let cursor: string | null = null;
  let disposed = false;

  function closeSource(): void {
    if (!source) {
      return;
    }

    source.close();
    source = null;
  }

  function scheduleReconnect(): void {
    if (reconnectTimer !== null) {
      return;
    }

    closeSource();
    params.setState("offline");

    const delay = reconnectDelayMs;
    reconnectDelayMs = Math.min(reconnectDelayMs * 2, RECONNECT_MAX_MS);

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;

      if (!disposed) {
        openStream();
      }
    }, withJitter(delay));
  }

  function openStream(): void {
    closeSource();
    params.setState("connecting");

    const next = params.openEventSource(
      realtimeStreamUrl(params.channel, params.id, cursor),
    );

    source = next;

    next.addEventListener("open", () => {
      if (source !== next) {
        return;
      }

      reconnectDelayMs = RECONNECT_BASE_MS;
      params.setState("live");
    });

    next.addEventListener("message", (event) => {
      if (source !== next) {
        return;
      }

      params.setState("live");

      if (event.lastEventId) {
        cursor = event.lastEventId;
      }

      params.onMessage({
        data: event.data,
        id: event.lastEventId || undefined,
      });
    });

    next.addEventListener("error", () => {
      if (source !== next) {
        return;
      }

      // CLOSED means the browser has stopped retrying.
      if (next.readyState === EVENT_SOURCE_CLOSED) {
        scheduleReconnect();
        return;
      }

      params.setState("connecting");
    });
  }

  openStream();

  return () => {
    disposed = true;
    closeSource();

    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };
}
