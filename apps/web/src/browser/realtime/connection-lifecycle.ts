import {
  realtimeStreamUrl,
  type RealtimeChannelName,
  type RealtimeMessage,
} from "~/contracts/realtime/channel";

import type { ReadRealtimeStream } from "./read-realtime-stream";

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

function applyJitter(delayMs: number): number {
  return delayMs * (0.5 + Math.random());
}

export type ConnectionState =
  | "idle"
  | "connecting"
  | "live"
  | "offline"
  | "denied";

export interface ConnectionParams {
  channel: RealtimeChannelName;
  id: string;
  onMessage: (message: RealtimeMessage) => void;
  readStream: ReadRealtimeStream;
  setState: (state: ConnectionState) => void;
}

export function startConnection(params: ConnectionParams): () => void {
  let controller: AbortController | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectDelayMs = RECONNECT_BASE_MS;
  let cursor: string | null = null;
  let disposed = false;

  function scheduleReconnect(): void {
    const delay = reconnectDelayMs;

    reconnectDelayMs = Math.min(reconnectDelayMs * 2, RECONNECT_MAX_MS);

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;

      if (!disposed) {
        void openStream();
      }
    }, applyJitter(delay));
  }

  async function openStream(): Promise<void> {
    controller = new AbortController();
    params.setState("connecting");

    const outcome = await params.readStream({
      url: realtimeStreamUrl(params.channel, params.id),
      cursor,
      signal: controller.signal,

      onOpen: () => {
        reconnectDelayMs = RECONNECT_BASE_MS;
        params.setState("live");
      },

      onMessage: (message) => {
        if (message.id) {
          cursor = message.id;
        }

        params.onMessage(message);
      },
    });

    if (disposed) {
      return;
    }

    // Reconnecting cannot change an authorization failure.
    if (outcome.kind === "denied") {
      params.setState("denied");
      return;
    }

    // Clean closes are normal stream rollovers, not connectivity failures.
    params.setState(outcome.kind === "closed" ? "connecting" : "offline");

    scheduleReconnect();
  }

  void openStream();

  return () => {
    disposed = true;
    controller?.abort();

    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };
}
