import { createLogger } from "~/lib/observability/logger";
import { subscribeRedisChannel } from "~/lib/redis/subscriber";

import type { TopicHub } from "./topic-hub";

interface RedisTopicBridgeConfig<TEvent> {
  name: string;
  channel: string;
  hub: TopicHub;
  parseEvent: (rawMessage: string) => TEvent | null;
  topicForEvent: (event: TEvent) => string;
  serializeEvent?: (event: TEvent) => string;
}

export function createRedisTopicBridge<TEvent>(
  config: RedisTopicBridgeConfig<TEvent>,
) {
  const logger = createLogger(`realtime-bridge:${config.name}`);
  let started = false;

  async function start(): Promise<void> {
    if (started) {
      return;
    }

    try {
      await subscribeRedisChannel(config.channel, (message) => {
        const event = config.parseEvent(message);
        if (!event) {
          return;
        }

        const topic = config.topicForEvent(event);
        const payload = config.serializeEvent
          ? config.serializeEvent(event)
          : JSON.stringify(event);
        config.hub.broadcast(topic, payload);
      });
      started = true;
      logger.info("bridge_started", { channel: config.channel });
    } catch (error: unknown) {
      started = false;
      logger.error("bridge_failed", {
        channel: config.channel,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { start };
}
