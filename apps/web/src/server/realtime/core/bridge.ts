import { dbUrl } from "~/lib/db/db";
import { createPgListener } from "~/lib/db/notify";
import { createLogger } from "~/lib/observability/logger";

import type { TopicHub } from "./topic-hub";

interface PgTopicBridgeConfig<TEvent> {
  name: string;
  channel: string;
  hub: TopicHub;
  parseEvent: (rawPayload: string) => TEvent | null;
  topicForEvent: (event: TEvent) => string;
  serializeEvent?: (event: TEvent) => string;
}

// Bridges a Postgres LISTEN/NOTIFY channel to an in-process topic hub. Events
// ride the NOTIFY payload directly (they are a few hundred bytes, far under the
// 8000-byte ceiling), so there is no fetch-back: parse the payload and fan it
// out to subscribers of the derived topic.
export function createPgTopicBridge<TEvent>(
  config: PgTopicBridgeConfig<TEvent>,
) {
  const logger = createLogger(`realtime-bridge:${config.name}`);
  const listener = createPgListener(dbUrl);
  let started = false;

  async function start(): Promise<void> {
    if (started) {
      return;
    }

    listener.on(config.channel, (payload) => {
      const event = config.parseEvent(payload);
      if (!event) {
        return;
      }

      const topic = config.topicForEvent(event);
      const out = config.serializeEvent
        ? config.serializeEvent(event)
        : JSON.stringify(event);
      config.hub.broadcast(topic, out);
    });

    try {
      await listener.start();
      started = true;
      logger.info("bridge_started", { channel: config.channel });
    } catch (error: unknown) {
      logger.error("bridge_failed", {
        channel: config.channel,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { start };
}
