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
      { key: "CRM_EXPORT", channel: JOB_CHANNELS.CRM_EXPORT },
      { key: "CRM_IMPORT", channel: JOB_CHANNELS.CRM_IMPORT },
      {
        key: "INTEGRATION_OUTBOX_NEEDS_EXECUTIVE_INPUT",
        channel: JOB_CHANNELS.INTEGRATION_OUTBOX_NEEDS_EXECUTIVE_INPUT,
      },
      {
        key: "INTEGRATION_OUTBOX_READY_FOR_QUOTATION",
        channel: JOB_CHANNELS.INTEGRATION_OUTBOX_READY_FOR_QUOTATION,
      },
      { key: "SALES_EXPORT", channel: JOB_CHANNELS.SALES_EXPORT },
      { key: "ENRICHMENT", channel: JOB_CHANNELS.ENRICHMENT },
      {
        key: "ENRICHMENT_WRITEBACK",
        channel: JOB_CHANNELS.ENRICHMENT_WRITEBACK,
      },
      {
        key: "NOTIFICATIONS_EMAIL",
        channel: JOB_CHANNELS.NOTIFICATIONS_EMAIL,
      },
      {
        key: "NOTIFICATIONS_WHATSAPP",
        channel: JOB_CHANNELS.NOTIFICATIONS_WHATSAPP,
      },
    ] as const;
    const keyByChannel = new Map<string, keyof typeof JOB_CHANNELS>(
      channelEntries.map(({ key, channel }) => [channel, key]),
    );

    const resolveKey = (
      channel: string,
    ): keyof typeof JOB_CHANNELS | undefined => {
      return keyByChannel.get(channel);
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

    await Promise.all(
      channelEntries.map(({ channel }) =>
        subscribe.call(subscriber, [channel], onMessage),
      ),
    );

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
