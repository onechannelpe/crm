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

    // Reverse map channels to triggers keys
    const channelToKey = Object.entries(JOB_CHANNELS).reduce(
      (acc, [key, channel]) => {
        acc[channel] = key as keyof typeof JOB_CHANNELS;
        return acc;
      },
      {} as Record<string, keyof typeof JOB_CHANNELS>,
    );

    await (subscriber as any).subscribe(
      JOB_CHANNELS.CRM_EXPORT,
      JOB_CHANNELS.CRM_IMPORT,
      JOB_CHANNELS.SALES_EXPORT,
      JOB_CHANNELS.ENRICHMENT,
      (message: string, channel: string) => {
        const key = channelToKey[channel];
        const trigger = key ? triggers[key] : null;

        if (trigger) {
          logger.debug("job_doorbell_received", { channel, key });
          trigger();
        }
      },
    );

    logger.info("subscriber_listening", {
      channels: Object.values(JOB_CHANNELS),
    });
  } catch (err: any) {
    logger.error("subscriber_failed", { error: err.message });
    // Fallback polling will handle it
  }
}
