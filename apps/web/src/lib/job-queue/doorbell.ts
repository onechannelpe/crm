import type { JobChannel } from "~/lib/job-queue/channels";
import { createLogger } from "~/lib/observability/logger";
import { getRedisPublisherClient } from "~/lib/redis/client";

const logger = createLogger("queue-doorbell");

export interface QueueDoorbell {
  wake(channel: JobChannel, id: string | number): void;
}

export const noopQueueDoorbell: QueueDoorbell = {
  wake() {},
};

function logFailure(channel: JobChannel, id: string | number, error: unknown) {
  logger.error("queue_doorbell_publish_failed", {
    channel,
    id,
    error: error instanceof Error ? error.message : "Unknown error",
  });
}

export function createRedisQueueDoorbell(): QueueDoorbell {
  return {
    wake(channel, id) {
      try {
        void getRedisPublisherClient()
          .publish(channel, String(id))
          .catch((error: unknown) => logFailure(channel, id, error));
      } catch (error: unknown) {
        logFailure(channel, id, error);
      }
    },
  };
}
