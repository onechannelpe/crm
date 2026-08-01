import { dbUrl } from "~/server/platform/database/db";
import {
  createPgListener,
  type PgListenerHandler,
} from "~/server/platform/database/notify";
import { createLogger } from "~/shared/observability/runtime-logger";

import type { RealtimeChannel } from "./channel";
import { realtimeChannels } from "./registry";
import { TopicHub } from "./topic-hub";

// Keep idle streams alive through proxies.
const PING_INTERVAL_MS = 20_000;

// Force periodic reconnects so authorization is checked again.
const MAX_STREAM_AGE_MS = 15 * 60_000;

const logger = createLogger("realtime");

// Shared across requests to avoid one hub and LISTEN connection per stream.
export const realtimeHub = new TopicHub();

function broadcastPayload(channel: RealtimeChannel, payload: string): void {
  const topic = channel.topicOfPayload(payload);

  if (topic === null) {
    return;
  }

  // The writer owns the serialized browser payload.
  realtimeHub.broadcast(topic, {
    data: payload,
    id: channel.cursorOf(payload),
  });
}

function listenerHandlers(): Record<string, PgListenerHandler[]> {
  const handlers: Record<string, PgListenerHandler[]> = {};

  for (const channel of realtimeChannels) {
    const existing = handlers[channel.pgChannel] ?? [];

    existing.push((payload) => broadcastPayload(channel, payload));
    handlers[channel.pgChannel] = existing;
  }

  return handlers;
}

const listener = createPgListener(dbUrl, listenerHandlers(), {
  // Notifications may be missed while disconnected. Closing the streams makes
  // clients reconnect and read their current state again.
  onConnected: () => realtimeHub.closeAll(),
});

let startPromise: Promise<void> | null = null;

async function start(): Promise<void> {
  await listener.start();

  setInterval(
    () => realtimeHub.sweep(performance.now(), MAX_STREAM_AGE_MS),
    PING_INTERVAL_MS,
  ).unref();

  logger.info("realtime_started", {
    channels: realtimeChannels.map((channel) => channel.name),
  });
}

// Start lazily so processes that never serve streams open no LISTEN connection.
export function ensureRealtimeStarted(): Promise<void> {
  startPromise ??= start();

  return startPromise;
}
