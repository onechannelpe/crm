import type { JobChannel } from "~/lib/job-queue/channels";
import { createLogger } from "~/lib/observability/logger";

import { getRedisPublisherClient } from "./client";

const logger = createLogger("redis-publisher");

export function getPublisher() {
  return getRedisPublisherClient();
}

export async function publishJob(channel: JobChannel, jobId: number) {
  try {
    await getPublisher().publish(channel, String(jobId));
  } catch (error: unknown) {
    logger.error("publish_failed", {
      channel,
      jobId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // Fallback polling will process pending jobs.
  }
}

export async function publishJson(channel: JobChannel, payload: unknown) {
  try {
    await getPublisher().publish(channel, JSON.stringify(payload));
  } catch (error: unknown) {
    logger.error("publish_json_failed", {
      channel,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
