import type { JobChannel } from "~/lib/job-queue/channels";
import { createLogger } from "~/lib/observability/logger";

import { getRedisPublisherClient } from "./client";

const logger = createLogger("redis-publisher");

/**
 * Publish an inline payload that travels on the channel itself (the subscriber
 * does not refetch). Fire-and-forget: dropped messages are tolerable for the
 * ephemeral progress/wake signals that use this.
 */
export function publishMessage(channel: JobChannel, payload: unknown): void {
  try {
    void getRedisPublisherClient()
      .publish(channel, JSON.stringify(payload))
      .catch((error: unknown) => {
        logger.error("publish_message_failed", {
          channel,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });
  } catch (error: unknown) {
    logger.error("publish_message_failed", {
      channel,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
