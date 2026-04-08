import { RedisClient } from "bun";

import { createLogger } from "~/lib/observability/logger";

import { JOB_CHANNELS } from "../job-queue/channels";

const logger = createLogger("redis-subscriber");

let subscriber: RedisClient | null = null;

/**
 * Starts a Redis subscriber that listens for job notifications.
 * When a message is received on a channel, it calls the provided trigger function.
 */
export async function startJobSubscriber(triggers: {
  [K in keyof typeof JOB_CHANNELS]?: () => void;
}) {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  logger.info("initializing_subscriber", { url });

  try {
    subscriber = new RedisClient(url);
    const channelEntries = [
      ["CRM_EXPORT", JOB_CHANNELS.CRM_EXPORT],
      ["CRM_IMPORT", JOB_CHANNELS.CRM_IMPORT],
      ["SALES_EXPORT", JOB_CHANNELS.SALES_EXPORT],
      ["ENRICHMENT", JOB_CHANNELS.ENRICHMENT],
    ] as const;

    const resolveKey = (
      channel: string,
    ): keyof typeof JOB_CHANNELS | undefined => {
      for (const [key, value] of channelEntries) {
        if (value === channel) {
          return key;
        }
      }
      return undefined;
    };

    const subscribe = Reflect.get(subscriber, "subscribe");
    if (typeof subscribe !== "function") {
      throw new Error("Redis subscriber does not expose subscribe()");
    }

    const onMessage = (_message: string, channel: string) => {
      const key = resolveKey(channel);
      const trigger = key ? triggers[key] : null;
      if (!trigger) {
        return;
      }
      logger.debug("job_doorbell_received", { channel, key });
      trigger();
    };

    await Promise.all([
      subscribe.call(subscriber, [JOB_CHANNELS.CRM_EXPORT], onMessage),
      subscribe.call(subscriber, [JOB_CHANNELS.CRM_IMPORT], onMessage),
      subscribe.call(subscriber, [JOB_CHANNELS.SALES_EXPORT], onMessage),
      subscribe.call(subscriber, [JOB_CHANNELS.ENRICHMENT], onMessage),
    ]);

    logger.info("subscriber_listening", {
      channels: Object.values(JOB_CHANNELS),
    });
  } catch (error: unknown) {
    logger.error("subscriber_failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // Fallback polling will handle it
  }
}
