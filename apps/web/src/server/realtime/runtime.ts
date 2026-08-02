import type { H3Event } from "h3";

import { getSession } from "~/server/platform/action/session";
import {
  createPgListener,
  type PgListenerHandler,
} from "~/server/platform/database/notify";
import { createLogger } from "~/shared/observability/runtime-logger";
import { Err, Ok, type Result } from "~/shared/result";

import type { RealtimeChannel } from "./channel";
import { openRealtimeStream } from "./stream";
import { TopicHub } from "./topic-hub";

// Keep idle streams alive through proxies.
const PING_INTERVAL_MS = 20_000;

// Force periodic reconnects so authorization is checked again.
const MAX_STREAM_AGE_MS = 15 * 60_000;

const logger = createLogger("realtime");

export type RealtimeOpenError = "unauthenticated" | "not_found";

export interface RealtimeOpenRequest {
  channel: string;
  id: string;
  cursor: string | null;
}

type RealtimeStream = NonNullable<
  Awaited<ReturnType<typeof openRealtimeStream>>
>;

export interface RealtimeService {
  openStream(
    h3Event: H3Event,
    request: RealtimeOpenRequest,
  ): Promise<Result<RealtimeStream, RealtimeOpenError>>;
}

export function createRealtimeService(input: {
  channels: readonly RealtimeChannel[];
  databaseUrl: string;
}): RealtimeService {
  const hub = new TopicHub();
  let startPromise: Promise<void> | null = null;

  function broadcastPayload(channel: RealtimeChannel, payload: string): void {
    const topic = channel.topicOfPayload(payload);

    if (topic === null) {
      return;
    }

    // The writer owns the serialized browser payload.
    hub.broadcast(topic, {
      data: payload,
      id: channel.cursorOf(payload),
    });
  }

  function listenerHandlers(): Record<string, PgListenerHandler[]> {
    const handlers: Record<string, PgListenerHandler[]> = {};

    for (const channel of input.channels) {
      const existing = handlers[channel.pgChannel] ?? [];

      existing.push((payload) => broadcastPayload(channel, payload));
      handlers[channel.pgChannel] = existing;
    }

    return handlers;
  }

  const listener = createPgListener(input.databaseUrl, listenerHandlers(), {
    // Notifications may be missed while disconnected. Closing the streams makes
    // clients reconnect and read their current state again.
    onConnected: () => hub.closeAll(),
  });

  async function start(): Promise<void> {
    await listener.start();

    setInterval(
      () => hub.sweep(performance.now(), MAX_STREAM_AGE_MS),
      PING_INTERVAL_MS,
    ).unref();

    logger.info("realtime_started", {
      channels: input.channels.map((channel) => channel.name),
    });
  }

  async function openStream(
    h3Event: H3Event,
    request: RealtimeOpenRequest,
  ): Promise<Result<RealtimeStream, RealtimeOpenError>> {
    const session = await getSession();

    if (!session || session.sessionClass !== "app") {
      return Err("unauthenticated");
    }

    const channel = input.channels.find(({ name }) => name === request.channel);

    if (!channel) {
      return Err("not_found");
    }

    const entry = channel.entry(request.id, session);

    if (!entry) {
      return Err("not_found");
    }

    // Start before subscribing so every opened stream is backed by the shared
    // listener and hub. The channel's opening read establishes its own state.
    startPromise ??= start();
    await startPromise;

    const stream = await openRealtimeStream(
      hub,
      h3Event,
      entry,
      request.cursor,
    );

    return stream ? Ok(stream) : Err("not_found");
  }

  return {
    openStream,
  };
}
