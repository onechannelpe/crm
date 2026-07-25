import { dbUrl } from "~/server/platform/database/db";
import {
  createPgListener,
  type PgListenerHandler,
} from "~/server/platform/database/notify";
import { createLogger } from "~/shared/observability/runtime-logger";

import type { TopicHub } from "./topic-hub";

interface PgTopicBridgeConfig<TEvent> {
  name: string;
  channel: string;
  hub: TopicHub;
  parseEvent: (rawPayload: string) => TEvent | null;
  topicForEvent: (event: TEvent) => string;
  serializeEvent?: (event: TEvent) => string;
  // Runs after every (re)connect. Use it to re-sync subscribers from
  // durable state.
  reconcile?: (hub: TopicHub) => Promise<void>;
}

export function createPgTopicBridge<TEvent>(
  config: PgTopicBridgeConfig<TEvent>,
) {
  const logger = createLogger(`realtime-bridge:${config.name}`);

  const handleNotification: PgListenerHandler = (payload) => {
    const event = config.parseEvent(payload);
    if (!event) {
      return;
    }

    const topic = config.topicForEvent(event);
    const out = config.serializeEvent
      ? config.serializeEvent(event)
      : JSON.stringify(event);
    config.hub.broadcast(topic, out);
  };

  const reconcile = config.reconcile;
  const listener = createPgListener(
    dbUrl,
    { [config.channel]: [handleNotification] },
    { onConnected: reconcile && (() => reconcile(config.hub)) },
  );
  let started = false;

  async function start(): Promise<void> {
    if (started) {
      return;
    }
    started = true;

    await listener.start();
    logger.info("bridge_started", { channel: config.channel });
  }

  return { start };
}
